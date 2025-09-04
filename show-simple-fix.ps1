# Simple RLS Disable - No Policy Recreation
Write-Host "=== Simple RLS Disable ===" -ForegroundColor Green
Write-Host ""
Write-Host "The previous fix had policy conflicts. This simpler fix will:" -ForegroundColor Yellow
Write-Host "- Drop all existing policies" -ForegroundColor White
Write-Host "- Disable RLS on all tables" -ForegroundColor White
Write-Host "- Not try to recreate policies" -ForegroundColor White
Write-Host ""
Write-Host "Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host ""

# Read and display the SQL content
$sqlContent = Get-Content "database/simple-rls-disable.sql" -Raw
Write-Host $sqlContent -ForegroundColor Yellow

Write-Host ""
Write-Host "This should work without any policy conflicts!" -ForegroundColor Green
