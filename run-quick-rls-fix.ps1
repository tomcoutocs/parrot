# Quick RLS Fix Script
# This script provides instructions for fixing RLS policies

Write-Host "=== RLS Fix Instructions ===" -ForegroundColor Green
Write-Host ""
Write-Host "Since Supabase CLI is not linked, please follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to your Supabase project dashboard" -ForegroundColor Cyan
Write-Host "2. Navigate to SQL Editor" -ForegroundColor Cyan
Write-Host "3. Copy the contents of database/quick-rls-fix.sql" -ForegroundColor Cyan
Write-Host "4. Paste and execute the SQL" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will fix the RLS policies to allow admin users access to all data." -ForegroundColor Green
Write-Host ""
Write-Host "The fix uses the proper auth.uid() pattern:" -ForegroundColor Yellow
Write-Host "- Admin users can see all companies, projects, tasks, etc." -ForegroundColor White
Write-Host "- Non-admin users are restricted to their own company" -ForegroundColor White
Write-Host ""
Write-Host "After running the SQL, test the company detail modal functionality." -ForegroundColor Green
