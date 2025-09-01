-- Create Meeting System Tables
-- This script sets up the database structure for meeting requests and approvals

-- Step 1: Create meeting_requests table
CREATE TABLE IF NOT EXISTS meeting_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_date DATE NOT NULL,
    requested_time_slot VARCHAR(10) NOT NULL, -- e.g., "9:00 AM", "14:30"
    meeting_title VARCHAR(255) NOT NULL,
    meeting_description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create confirmed_meetings table
CREATE TABLE IF NOT EXISTS confirmed_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_request_id UUID REFERENCES meeting_requests(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meeting_requests_requester_id ON meeting_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_date ON meeting_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_confirmed_meetings_date ON confirmed_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_confirmed_meetings_requester_id ON confirmed_meetings(requester_id);

-- Step 4: Enable Row Level Security
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies for meeting_requests

-- Users can view their own meeting requests
CREATE POLICY "Users can view own meeting requests" ON meeting_requests
    FOR SELECT USING (
        auth.uid() = requester_id
    );

-- Users can create their own meeting requests
CREATE POLICY "Users can create own meeting requests" ON meeting_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
    );

-- Users can update their own pending meeting requests
CREATE POLICY "Users can update own pending meeting requests" ON meeting_requests
    FOR UPDATE USING (
        auth.uid() = requester_id AND status = 'pending'
    );

-- Admins can view all meeting requests
CREATE POLICY "Admins can view all meeting requests" ON meeting_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can update all meeting requests
CREATE POLICY "Admins can update all meeting requests" ON meeting_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Step 6: Create RLS Policies for confirmed_meetings

-- Users can view meetings they're involved in
CREATE POLICY "Users can view own meetings" ON confirmed_meetings
    FOR SELECT USING (
        auth.uid() = requester_id
    );

-- Admins can view all confirmed meetings
CREATE POLICY "Admins can view all confirmed meetings" ON confirmed_meetings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Only admins can create confirmed meetings
CREATE POLICY "Only admins can create confirmed meetings" ON confirmed_meetings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Only admins can update confirmed meetings
CREATE POLICY "Only admins can update confirmed meetings" ON confirmed_meetings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create triggers for updated_at
CREATE TRIGGER update_meeting_requests_updated_at 
    BEFORE UPDATE ON meeting_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confirmed_meetings_updated_at 
    BEFORE UPDATE ON confirmed_meetings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Verify the setup
SELECT '=== VERIFICATION ===' as info;

SELECT
    'meeting_requests table: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_requests')
    THEN 'CREATED' ELSE 'FAILED' END as table_status,

    'confirmed_meetings table: ' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'confirmed_meetings')
    THEN 'CREATED' ELSE 'FAILED' END as table_status;

-- Check RLS status using a different method (compatible with older PostgreSQL versions)
SELECT '=== RLS STATUS CHECK ===' as info;

SELECT 
    'meeting_requests RLS: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'meeting_requests' 
        AND schemaname = 'public'
    )
    THEN 'TABLE EXISTS' ELSE 'MISSING' END as rls_status;

SELECT 
    'confirmed_meetings RLS: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'confirmed_meetings' 
        AND schemaname = 'public'
    )
    THEN 'TABLE EXISTS' ELSE 'MISSING' END as rls_status;

-- Step 10: Show sample data structure
SELECT '=== SAMPLE DATA STRUCTURE ===' as info;

SELECT 
    'meeting_requests columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'meeting_requests'
ORDER BY ordinal_position;

SELECT 
    'confirmed_meetings columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'confirmed_meetings'
ORDER BY ordinal_position;
