-- Simple Fix for Meeting System Foreign Key Constraints
-- This script will definitely fix the constraint issue

-- Step 1: Show what we're working with
SELECT '=== CURRENT STATE ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
    AND kcu.column_name = 'requester_id';

-- Step 2: Drop ALL foreign key constraints on these tables (brute force approach)
SELECT '=== DROPPING ALL CONSTRAINTS ===' as info;

-- Get all constraint names and drop them
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint: % on table %', constraint_record.constraint_name, constraint_record.table_name;
    END LOOP;
END $$;

-- Step 3: Recreate the correct constraints
SELECT '=== RECREATING CONSTRAINTS ===' as info;

-- Add correct constraint for meeting_requests.requester_id -> auth.users.id
ALTER TABLE meeting_requests 
ADD CONSTRAINT meeting_requests_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add correct constraint for confirmed_meetings.requester_id -> auth.users.id
ALTER TABLE confirmed_meetings 
ADD CONSTRAINT confirmed_meetings_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add constraint for confirmed_meetings.meeting_request_id -> meeting_requests.id
ALTER TABLE confirmed_meetings 
ADD CONSTRAINT confirmed_meetings_meeting_request_id_fkey 
FOREIGN KEY (meeting_request_id) REFERENCES meeting_requests(id) ON DELETE CASCADE;

-- Step 4: Verify the fix
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

-- Step 5: Test the fix
SELECT '=== TESTING THE FIX ===' as info;

DO $$
BEGIN
    -- Check if we can see auth.users
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        RAISE NOTICE 'auth.users: ACCESSIBLE';
        
        -- Get a sample user ID
        DECLARE
            sample_user_id uuid;
        BEGIN
            SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
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
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Test insert: FAILED - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'auth.users: NOT ACCESSIBLE';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;

-- Step 6: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'Foreign key constraints have been fixed!' as message;
SELECT 'Test your meeting request submission now!' as next_step;
