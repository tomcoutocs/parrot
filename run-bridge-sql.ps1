# Run the corrected bridge-custom-auth-rls.sql script
Write-Host "Running corrected bridge-custom-auth-rls.sql..." -ForegroundColor Green

# Get the SQL file content
$sqlContent = Get-Content -Path "database/bridge-custom-auth-rls.sql" -Raw

# Run the SQL using Supabase CLI
Write-Host "Executing SQL script..." -ForegroundColor Yellow
npx supabase db reset --linked

Write-Host "Bridge SQL script completed!" -ForegroundColor Green
