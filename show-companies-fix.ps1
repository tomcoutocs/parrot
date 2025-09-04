# Fix RLS on Companies Table
Write-Host "=== Fix RLS on Companies Table ===" -ForegroundColor Green
Write-Host ""
Write-Host "This will fix RLS specifically on the companies table." -ForegroundColor Yellow
Write-Host ""
Write-Host "Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host ""

# Read and display the SQL content
$sqlContent = Get-Content "database/fix-companies-rls.sql" -Raw
Write-Host $sqlContent -ForegroundColor Yellow

Write-Host ""
Write-Host "This will:" -ForegroundColor Green
Write-Host "- Drop all existing policies on companies table" -ForegroundColor White
Write-Host "- Create a simple policy that allows all authenticated users" -ForegroundColor White
Write-Host "- Work with our custom auth system" -ForegroundColor White
Write-Host ""
Write-Host "After running this, you should have access to companies again!" -ForegroundColor Green
