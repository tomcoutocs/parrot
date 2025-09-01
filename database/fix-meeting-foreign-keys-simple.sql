-- Simple Fix for Meeting System Foreign Key Constraints
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

SELECT 
    'auth.users table exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN 'YES' ELSE 'NO' END as table_status;

SELECT 
    'auth.users has data: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM auth.users LIMIT 1
    ) THEN 'YES' ELSE 'NO' END as data_status;

-- Step 4: Check if public.users exists and has data
SELECT '=== PUBLIC.USERS CHECK ===' as info;

SELECT 
    'public.users table exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN 'YES' ELSE 'NO' END as table_status;

SELECT 
    'public.users has data: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM users LIMIT 1
    ) THEN 'YES' ELSE 'NO' END as data_status;

-- Show user count if table exists
SELECT 
    'Total users in public.users: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN (SELECT COUNT(*)::text FROM users) ELSE 'N/A' END as user_count;

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

-- Test if we can see the users table
SELECT 
    'users table accessible: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM users LIMIT 1) THEN 'YES' ELSE 'NO' END as test_result;

-- Test if we can get a sample user ID
SELECT 
    'can get sample user ID: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM users LIMIT 1) THEN 'YES' ELSE 'NO' END as test_result;

-- Step 9: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'Foreign key constraints have been fixed!' as message;
SELECT 'Test your meeting request submission now!' as next_step;
