# RLS Fix Instructions - Manual SQL Execution
# Since we can't run SQL through the CLI, here's exactly what you need to do

Write-Host "=== RLS Fix Instructions ===" -ForegroundColor Green
Write-Host ""
Write-Host "The Supabase CLI is not linked, so we need to run the SQL manually." -ForegroundColor Yellow
Write-Host ""
Write-Host "Here's exactly what you need to do:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your Supabase dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/bibqmpipnnyzguaunsgk" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Navigate to SQL Editor (left sidebar)" -ForegroundColor White
Write-Host ""
Write-Host "3. Copy and paste this SQL:" -ForegroundColor White
Write-Host ""

# Read and display the SQL content
$sqlContent = Get-Content "database/quick-rls-fix.sql" -Raw
Write-Host $sqlContent -ForegroundColor Yellow

Write-Host ""
Write-Host "4. Click 'Run' to execute the SQL" -ForegroundColor White
Write-Host ""
Write-Host "5. After running, test the company detail modal in your app" -ForegroundColor White
Write-Host ""
Write-Host "This will fix the RLS policies to allow admin users access to all data." -ForegroundColor Green
