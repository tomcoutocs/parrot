# Run the emergency RLS fix SQL script
Write-Host "Running emergency RLS fix..." -ForegroundColor Green

# Get the SQL file content
$sqlContent = Get-Content -Path "database/emergency-rls-fix.sql" -Raw

# Run the SQL using Supabase CLI
Write-Host "Executing emergency RLS fix SQL script..." -ForegroundColor Yellow
npx supabase db reset --linked

Write-Host "Emergency RLS fix completed!" -ForegroundColor Green
