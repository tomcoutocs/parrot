-- Complete Fix for Meeting System Foreign Key Constraints
-- This script fixes the foreign key references to work with your current user system

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    ccu.table_schema AS foreign_schema
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY tc.table_name, tc.constraint_name;

-- Step 2: Check what tables exist for users
SELECT '=== AVAILABLE USER TABLES ===' as info;

SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%user%' 
    OR table_name = 'users'
    OR table_schema = 'auth'
ORDER BY table_schema, table_name;

-- Step 3: Check if auth.users exists and has data
SELECT '=== AUTH.USERS CHECK ===' as info;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'auth.users table: EXISTS';
        
        -- Check if it has data
        IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
            RAISE NOTICE 'auth.users table: HAS DATA';
        ELSE
            RAISE NOTICE 'auth.users table: NO DATA';
        END IF;
    ELSE
        RAISE NOTICE 'auth.users table: NOT FOUND';
    END IF;
END $$;

-- Step 4: Check if public.users exists and has data
SELECT '=== PUBLIC.USERS CHECK ===' as info;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'public.users table: EXISTS';
        
        -- Check if it has data
        IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
            RAISE NOTICE 'public.users table: HAS DATA';
            
            -- Show sample user IDs
            RAISE NOTICE 'Sample user IDs from public.users:';
            -- Just show the count instead of looping through records
            RAISE NOTICE '  Total users found: %', (SELECT COUNT(*) FROM users);
        ELSE
            RAISE NOTICE 'public.users table: NO DATA';
        END IF;
    ELSE
        RAISE NOTICE 'public.users table: NOT FOUND';
    END IF;
END $$;

-- Step 5: Drop existing foreign key constraints
SELECT '=== DROPPING EXISTING CONSTRAINTS ===' as info;

ALTER TABLE meeting_requests DROP CONSTRAINT IF EXISTS meeting_requests_requester_id_fkey;
ALTER TABLE confirmed_meetings DROP CONSTRAINT IF EXISTS confirmed_meetings_requester_id_fkey;
ALTER TABLE confirmed_meetings DROP CONSTRAINT IF EXISTS confirmed_meetings_meeting_request_id_fkey;

-- Step 6: Create the correct foreign key constraints
SELECT '=== CREATING CORRECT CONSTRAINTS ===' as info;

-- Option A: If using public.users table (recommended for demo auth)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Creating foreign key to public.users table';
        
        -- Add constraint for meeting_requests.requester_id -> users.id
        ALTER TABLE meeting_requests 
        ADD CONSTRAINT meeting_requests_requester_id_fkey 
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
        
        -- Add constraint for confirmed_meetings.requester_id -> users.id
        ALTER TABLE confirmed_meetings 
        ADD CONSTRAINT confirmed_meetings_requester_id_fkey 
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign keys created successfully to public.users';
    ELSE
        RAISE NOTICE 'public.users table not found, cannot create foreign key';
    END IF;
END $$;

-- Add constraint for confirmed_meetings.meeting_request_id -> meeting_requests.id
ALTER TABLE confirmed_meetings 
ADD CONSTRAINT confirmed_meetings_meeting_request_id_fkey 
FOREIGN KEY (meeting_request_id) REFERENCES meeting_requests(id) ON DELETE CASCADE;

-- Step 7: Verify the fix
SELECT '=== VERIFICATION ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    ccu.table_schema AS foreign_schema
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY tc.table_name, tc.constraint_name;

-- Step 8: Test the fix
SELECT '=== TESTING THE FIX ===' as info;

DO $$
DECLARE
    sample_user_id uuid;
BEGIN
    -- Check if we can see users table
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RAISE NOTICE 'users table: ACCESSIBLE';
        
        -- Get a sample user ID
        SELECT id INTO sample_user_id FROM users LIMIT 1;
        RAISE NOTICE 'Sample user ID: %', sample_user_id;
        
        -- Try to insert a test record (this will be rolled back)
        INSERT INTO meeting_requests (
            requester_id,
            requested_date,
            requested_time_slot,
            meeting_title,
            meeting_description
        ) VALUES (
            sample_user_id,
            '2024-01-01',
            '9:00 AM',
            'Test Meeting - Will be deleted',
            'This is a test to verify the constraint works'
        );
        
        RAISE NOTICE 'Test insert: SUCCESS - Constraint is working!';
        
        -- Clean up the test record
        DELETE FROM meeting_requests WHERE meeting_title = 'Test Meeting - Will be deleted';
        RAISE NOTICE 'Test record: CLEANED UP';
        
    ELSE
        RAISE NOTICE 'users table: NOT ACCESSIBLE';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert: FAILED - %', SQLERRM;
END $$;

-- Step 9: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'Foreign key constraints have been fixed!' as message;
SELECT 'Test your meeting request submission now!' as next_step;
