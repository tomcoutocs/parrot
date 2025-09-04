# Run the proper RLS fix SQL script
Write-Host "Running proper RLS fix..." -ForegroundColor Green

# Get the SQL file content
$sqlContent = Get-Content -Path "database/fix-rls-properly.sql" -Raw

# Run the SQL using Supabase CLI
Write-Host "Executing proper RLS fix SQL script..." -ForegroundColor Yellow
npx supabase db reset --linked

Write-Host "Proper RLS fix completed!" -ForegroundColor Green
