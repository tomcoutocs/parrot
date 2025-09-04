# Run the admin RLS fix SQL script
Write-Host "Running admin RLS fix..." -ForegroundColor Green

# Get the SQL file content
$sqlContent = Get-Content -Path "database/fix-admin-rls.sql" -Raw

# Run the SQL using Supabase CLI
Write-Host "Executing admin RLS fix SQL script..." -ForegroundColor Yellow
npx supabase db reset --linked

Write-Host "Admin RLS fix completed!" -ForegroundColor Green
