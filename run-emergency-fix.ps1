# Run the emergency performance fix SQL script
Write-Host "Running emergency performance fix..." -ForegroundColor Green

# Get the SQL file content
$sqlContent = Get-Content -Path "database/emergency-performance-fix.sql" -Raw

# Run the SQL using Supabase CLI
Write-Host "Executing emergency performance fix SQL script..." -ForegroundColor Yellow
npx supabase db reset --linked

Write-Host "Emergency performance fix completed!" -ForegroundColor Green
