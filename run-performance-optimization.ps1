# Database Performance Optimization Script
# This script runs the database optimization SQL to improve performance for multiple concurrent users

param(
    [string]$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL,
    [string]$SupabaseKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY,
    [string]$DatabaseUrl = $env:DATABASE_URL
)

Write-Host "🚀 Starting Database Performance Optimization..." -ForegroundColor Green

# Check if required environment variables are set
if (-not $SupabaseUrl -or $SupabaseUrl -eq "https://placeholder.supabase.co") {
    Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set or is using placeholder value" -ForegroundColor Red
    Write-Host "Please set your Supabase URL in your environment variables" -ForegroundColor Yellow
    exit 1
}

if (-not $SupabaseKey -or $SupabaseKey -eq "placeholder-key") {
    Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set or is using placeholder value" -ForegroundColor Red
    Write-Host "Please set your Supabase key in your environment variables" -ForegroundColor Yellow
    exit 1
}

# Check if psql is available
try {
    $psqlVersion = psql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "psql not found"
    }
    Write-Host "✅ PostgreSQL client found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: PostgreSQL client (psql) is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "  - Windows: Download from https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "  - macOS: brew install postgresql" -ForegroundColor Yellow
    Write-Host "  - Linux: sudo apt-get install postgresql-client" -ForegroundColor Yellow
    exit 1
}

# Function to extract database connection details from Supabase URL
function Get-DatabaseConnectionString {
    param([string]$SupabaseUrl)
    
    # Extract project reference from Supabase URL
    # Example: https://xyz.supabase.co -> xyz
    $projectRef = ($SupabaseUrl -split "//")[1] -split "\." | Select-Object -First 1
    
    if (-not $projectRef) {
        throw "Could not extract project reference from Supabase URL"
    }
    
    # Construct database URL
    $databaseUrl = "postgresql://postgres:[YOUR-PASSWORD]@db.$projectRef.supabase.co:5432/postgres"
    
    return @{
        ProjectRef = $projectRef
        DatabaseUrl = $databaseUrl
    }
}

# Get database connection details
try {
    $dbInfo = Get-DatabaseConnectionString -SupabaseUrl $SupabaseUrl
    Write-Host "📊 Project Reference: $($dbInfo.ProjectRef)" -ForegroundColor Cyan
    Write-Host "🔗 Database URL: $($dbInfo.DatabaseUrl)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check if optimization SQL file exists
$sqlFile = "database/performance-optimization.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: Performance optimization SQL file not found: $sqlFile" -ForegroundColor Red
    Write-Host "Please ensure the file exists in the database directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Found optimization SQL file: $sqlFile" -ForegroundColor Green

# Prompt for database password
Write-Host "`n🔐 Database Connection Setup" -ForegroundColor Yellow
Write-Host "To run the optimization script, you need your Supabase database password." -ForegroundColor White
Write-Host "You can find this in your Supabase dashboard under Settings > Database" -ForegroundColor White
Write-Host "`nNote: The password will not be stored and will only be used for this operation." -ForegroundColor White

$password = Read-Host "Enter your Supabase database password" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

if (-not $plainPassword) {
    Write-Host "❌ Error: Password is required to connect to the database" -ForegroundColor Red
    exit 1
}

# Construct the final database URL with password
$finalDatabaseUrl = $dbInfo.DatabaseUrl -replace "\[YOUR-PASSWORD\]", $plainPassword

Write-Host "`n🔧 Running Database Optimizations..." -ForegroundColor Green

# Test database connection first
Write-Host "Testing database connection..." -ForegroundColor Yellow
try {
    $testQuery = "SELECT version();"
    $testResult = echo $testQuery | psql $finalDatabaseUrl 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        throw "Database connection failed: $testResult"
    }
    
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your database password and connection details" -ForegroundColor Yellow
    exit 1
}

# Run the optimization script
Write-Host "Applying performance optimizations..." -ForegroundColor Yellow
try {
    $result = Get-Content $sqlFile | psql $finalDatabaseUrl 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database optimizations applied successfully!" -ForegroundColor Green
        Write-Host "`n📈 Performance improvements include:" -ForegroundColor Cyan
        Write-Host "  • Added indexes for faster queries" -ForegroundColor White
        Write-Host "  • Created composite indexes for common patterns" -ForegroundColor White
        Write-Host "  • Added partial indexes for better performance" -ForegroundColor White
        Write-Host "  • Created monitoring functions" -ForegroundColor White
        Write-Host "  • Optimized table statistics" -ForegroundColor White
        Write-Host "  • Added cleanup functions" -ForegroundColor White
        
        Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
        Write-Host "  1. Monitor performance in the Debug tab" -ForegroundColor White
        Write-Host "  2. Check cache hit rates and response times" -ForegroundColor White
        Write-Host "  3. Run the application with multiple users to test improvements" -ForegroundColor White
        
    } else {
        Write-Host "❌ Error applying optimizations: $result" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Clean up password from memory
$plainPassword = $null
[System.GC]::Collect()

Write-Host "`n🎉 Database optimization completed successfully!" -ForegroundColor Green
Write-Host "Your application should now handle multiple concurrent users much better." -ForegroundColor White
