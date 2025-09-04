# Emergency Auth Fix - Disable RLS on Users Table
Write-Host "=== EMERGENCY AUTH FIX ===" -ForegroundColor Red
Write-Host ""
Write-Host "URGENT: RLS is blocking authentication!" -ForegroundColor Yellow
Write-Host "The users table is blocked by RLS, preventing login." -ForegroundColor Yellow
Write-Host ""
Write-Host "This emergency fix will:" -ForegroundColor Cyan
Write-Host "- Disable RLS on the users table completely" -ForegroundColor White
Write-Host "- Allow authentication to work" -ForegroundColor White
Write-Host "- Fix access to all other tables" -ForegroundColor White
Write-Host ""
Write-Host "Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host ""

# Read and display the SQL content
$sqlContent = Get-Content "database/emergency-auth-fix.sql" -Raw
Write-Host $sqlContent -ForegroundColor Yellow

Write-Host ""
Write-Host "After running this, you should be able to log in again!" -ForegroundColor Green
