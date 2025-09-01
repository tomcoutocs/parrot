-- EMERGENCY: Remove Foreign Key Constraints for Meeting System
-- This script removes foreign key constraints to get meeting requests working immediately
-- WARNING: This removes referential integrity - re-add constraints later!

-- Step 1: Check current foreign key constraints
SELECT '=== CURRENT FOREIGN KEY CONSTRAINTS ===' as info;

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

-- Step 2: Remove all foreign key constraints
SELECT '=== REMOVING FOREIGN KEY CONSTRAINTS ===' as info;

-- Remove constraints from meeting_requests
ALTER TABLE meeting_requests DROP CONSTRAINT IF EXISTS meeting_requests_requester_id_fkey;

-- Remove constraints from confirmed_meetings
ALTER TABLE confirmed_meetings DROP CONSTRAINT IF EXISTS confirmed_meetings_requester_id_fkey;
ALTER TABLE confirmed_meetings DROP CONSTRAINT IF EXISTS confirmed_meetings_meeting_request_id_fkey;

-- Step 3: Verify constraints are removed
SELECT '=== VERIFICATION - CONSTRAINTS REMOVED ===' as info;

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

-- Step 4: Test basic insert functionality
SELECT '=== TESTING INSERT FUNCTIONALITY ===' as info;

-- Try to insert a test record (this will be rolled back)
DO $$
BEGIN
    -- This will test if we can insert without foreign key constraints
    INSERT INTO meeting_requests (
        requester_id,
        requested_date,
        requested_time_slot,
        meeting_title,
        meeting_description
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- dummy UUID
        '2024-01-01',
        '9:00 AM',
        'Test Meeting - Will be deleted',
        'This is a test meeting for debugging'
    );
    
    RAISE NOTICE 'Test insert successful - Foreign key constraints are not blocking';
    
    -- Clean up the test record
    DELETE FROM meeting_requests WHERE meeting_title = 'Test Meeting - Will be deleted';
    RAISE NOTICE 'Test record cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- Step 5: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'Foreign key constraints have been removed!' as message;
SELECT 'Users should now be able to create meeting requests!' as next_step;
SELECT 'Test your meeting request submission now!' as action;
SELECT '' as warning;
SELECT 'IMPORTANT: This is a temporary fix!' as warning;
SELECT 'Re-add foreign key constraints after testing!' as warning;
SELECT 'Use fix-meeting-foreign-keys-complete.sql to restore constraints!' as next_action;
