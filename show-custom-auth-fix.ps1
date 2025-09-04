# Fix RLS for Custom Auth System
Write-Host "=== Fix RLS for Custom Auth System ===" -ForegroundColor Green
Write-Host ""
Write-Host "This will fix RLS to work with our custom auth system." -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host ""

# Read and display the SQL content
$sqlContent = Get-Content "database/fix-rls-custom-auth.sql" -Raw
Write-Host $sqlContent -ForegroundColor Yellow

Write-Host ""
Write-Host "This will:" -ForegroundColor Green
Write-Host "- Drop all existing RLS policies" -ForegroundColor White
Write-Host "- Create simple policies that allow all authenticated users" -ForegroundColor White
Write-Host "- Work with our custom auth system" -ForegroundColor White
Write-Host ""
Write-Host "After running this, admin users should have access to all data!" -ForegroundColor Green
