# Disable RLS for Admin Users - Simple Fix
Write-Host "=== Disable RLS for Admin Users ===" -ForegroundColor Green
Write-Host ""
Write-Host "This will completely disable RLS restrictions for admin users." -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host ""

# Read and display the SQL content
$sqlContent = Get-Content "database/disable-rls-for-admin.sql" -Raw
Write-Host $sqlContent -ForegroundColor Yellow

Write-Host ""
Write-Host "This will:" -ForegroundColor Green
Write-Host "- Drop all existing RLS policies" -ForegroundColor White
Write-Host "- Create simple policies that allow all authenticated users" -ForegroundColor White
Write-Host "- Effectively disable RLS restrictions for admin users" -ForegroundColor White
Write-Host ""
Write-Host "After running this, admin users will have full access to all data!" -ForegroundColor Green
