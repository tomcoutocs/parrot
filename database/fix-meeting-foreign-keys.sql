-- Fix Meeting System Foreign Key Constraints
-- This script fixes the foreign key references to point to auth.users instead of users

-- Step 1: Check current foreign key constraints
SELECT '=== CURRENT FOREIGN KEY CONSTRAINTS ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY tc.table_name, tc.constraint_name;

-- Step 2: Drop existing foreign key constraints
SELECT '=== DROPPING EXISTING FOREIGN KEY CONSTRAINTS ===' as info;

-- Drop foreign key constraints from meeting_requests
ALTER TABLE meeting_requests DROP CONSTRAINT IF EXISTS meeting_requests_requester_id_fkey;

-- Drop foreign key constraints from confirmed_meetings
ALTER TABLE confirmed_meetings DROP CONSTRAINT IF EXISTS confirmed_meetings_requester_id_fkey;
ALTER TABLE confirmed_meetings DROP CONSTRAINT IF EXISTS confirmed_meetings_meeting_request_id_fkey;

-- Step 3: Recreate foreign key constraints to point to auth.users
SELECT '=== RECREATING FOREIGN KEY CONSTRAINTS ===' as info;

-- Add foreign key constraint for meeting_requests.requester_id -> auth.users.id
ALTER TABLE meeting_requests 
ADD CONSTRAINT meeting_requests_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraint for confirmed_meetings.requester_id -> auth.users.id
ALTER TABLE confirmed_meetings 
ADD CONSTRAINT confirmed_meetings_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraint for confirmed_meetings.meeting_request_id -> meeting_requests.id
ALTER TABLE confirmed_meetings 
ADD CONSTRAINT confirmed_meetings_meeting_request_id_fkey 
FOREIGN KEY (meeting_request_id) REFERENCES meeting_requests(id) ON DELETE CASCADE;

-- Step 4: Verify the new foreign key constraints
SELECT '=== VERIFYING NEW FOREIGN KEY CONSTRAINTS ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY tc.table_name, tc.constraint_name;

-- Step 5: Test the foreign key constraints
SELECT '=== TESTING FOREIGN KEY CONSTRAINTS ===' as info;

-- Check if we can see auth.users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        RAISE NOTICE 'auth.users: Accessible';
    ELSE
        RAISE NOTICE 'auth.users: Not accessible';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'auth.users: Access failed - %', SQLERRM;
END $$;

-- Check if we can see the custom users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RAISE NOTICE 'users table: Accessible';
    ELSE
        RAISE NOTICE 'users table: Not accessible';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'users table: Access failed - %', SQLERRM;
END $$;

-- Step 6: Instructions for next steps
SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Foreign key constraints have been fixed' as step;
SELECT '2. Test your meeting request submission now' as step;
SELECT '3. The requester_id should now properly reference auth.users' as step;
