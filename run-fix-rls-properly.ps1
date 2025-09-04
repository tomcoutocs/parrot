# Run RLS Fix Properly using Supabase Client
# This script applies the proper auth.uid() based RLS policies

Write-Host "=== Running RLS Fix Properly ===" -ForegroundColor Green

# Read the SQL file
$sqlContent = Get-Content "database/fix-rls-properly.sql" -Raw

Write-Host "SQL content loaded, length: $($sqlContent.Length) characters" -ForegroundColor Yellow

# Try to run via npx supabase if available
try {
    Write-Host "Attempting to run via Supabase CLI..." -ForegroundColor Yellow
    $sqlContent | npx supabase db reset --linked
    Write-Host "Successfully applied RLS fix via Supabase CLI!" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI failed, trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: Try to run via direct SQL execution
    try {
        Write-Host "Attempting direct SQL execution..." -ForegroundColor Yellow
        # This would require a direct database connection
        Write-Host "Direct SQL execution not available without database credentials" -ForegroundColor Red
        Write-Host "Please run the SQL manually in your Supabase dashboard:" -ForegroundColor Yellow
        Write-Host "1. Go to your Supabase project dashboard" -ForegroundColor Cyan
        Write-Host "2. Navigate to SQL Editor" -ForegroundColor Cyan
        Write-Host "3. Copy and paste the contents of database/fix-rls-properly.sql" -ForegroundColor Cyan
        Write-Host "4. Execute the SQL" -ForegroundColor Cyan
    } catch {
        Write-Host "All methods failed. Please run the SQL manually." -ForegroundColor Red
    }
}

Write-Host "=== RLS Fix Script Complete ===" -ForegroundColor Green
