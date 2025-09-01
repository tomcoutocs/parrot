-- Diagnose Meeting System Foreign Key Constraints
-- This script will show us exactly what constraints exist and need to be fixed

-- Step 1: Check all foreign key constraints on meeting tables
SELECT '=== ALL FOREIGN KEY CONSTRAINTS ===' as info;

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

-- Step 2: Check table structure
SELECT '=== TABLE STRUCTURE ===' as info;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY table_name, ordinal_position;

-- Step 3: Check if auth.users exists and is accessible
SELECT '=== AUTH.USERS CHECK ===' as info;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        RAISE NOTICE 'auth.users: EXISTS and ACCESSIBLE';
        RAISE NOTICE 'Sample user ID: %', (SELECT id FROM auth.users LIMIT 1);
    ELSE
        RAISE NOTICE 'auth.users: EXISTS but NOT ACCESSIBLE or EMPTY';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'auth.users: ERROR - %', SQLERRM;
END $$;

-- Step 4: Check if custom users table exists
SELECT '=== CUSTOM USERS TABLE CHECK ===' as info;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RAISE NOTICE 'users table: EXISTS and ACCESSIBLE';
        RAISE NOTICE 'Sample user ID: %', (SELECT id FROM users LIMIT 1);
    ELSE
        RAISE NOTICE 'users table: EXISTS but EMPTY or NOT ACCESSIBLE';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'users table: ERROR - %', SQLERRM;
END $$;

-- Step 5: Show exact constraint names that need to be dropped
SELECT '=== CONSTRAINT NAMES TO DROP ===' as info;

SELECT 
    'ALTER TABLE ' || tc.table_name || ' DROP CONSTRAINT IF EXISTS ' || tc.constraint_name || ';' as drop_command
FROM information_schema.table_constraints AS tc
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('meeting_requests', 'confirmed_meetings')
    AND tc.constraint_name LIKE '%requester_id%'
ORDER BY tc.table_name, tc.constraint_name;

-- Step 6: Show the correct constraints to create
SELECT '=== CORRECT CONSTRAINTS TO CREATE ===' as info;

SELECT '-- For meeting_requests table:' as info;
SELECT 'ALTER TABLE meeting_requests ADD CONSTRAINT meeting_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;' as create_command;

SELECT '-- For confirmed_meetings table:' as info;
SELECT 'ALTER TABLE confirmed_meetings ADD CONSTRAINT confirmed_meetings_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;' as create_command;
SELECT 'ALTER TABLE confirmed_meetings ADD CONSTRAINT confirmed_meetings_meeting_request_id_fkey FOREIGN KEY (meeting_request_id) REFERENCES meeting_requests(id) ON DELETE CASCADE;' as create_command;
