# HomeyChef - Easy Setup Script
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  🏠 HomeyChef Setup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is running
Write-Host "🔍 Checking if XAMPP MySQL is running..." -ForegroundColor Yellow
$mysqldRunning = Get-Process -Name mysqld -ErrorAction SilentlyContinue

if ($mysqldRunning) {
    Write-Host "✅ MySQL is running!" -ForegroundColor Green
} else {
    Write-Host "❌ MySQL is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please do the following:" -ForegroundColor Yellow
    Write-Host "1. Open XAMPP Control Panel" -ForegroundColor Yellow
    Write-Host "2. Start MySQL" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host ""

# Navigate to backend directory
Set-Location -Path "backend"

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    $envContent = @"
# Database Configuration for XAMPP
DB_NAME=homeychef
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost

# Server Configuration
PORT=3000
"@
    Set-Content -Path .env -Value $envContent
    Write-Host "✅ .env file created!" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists!" -ForegroundColor Green
}

Write-Host ""

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣ Make sure database 'homeychef' exists in phpMyAdmin" -ForegroundColor Yellow
Write-Host "   → Open: http://localhost/phpmyadmin" -ForegroundColor Yellow
Write-Host "   → Create database: homeychef" -ForegroundColor Yellow
Write-Host ""
Write-Host "2️⃣ Initialize the database:" -ForegroundColor Yellow
Write-Host "   → Run: node init.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣ Start the server:" -ForegroundColor Yellow
Write-Host "   → Run: npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "4️⃣ Open the frontend:" -ForegroundColor Yellow
Write-Host "   → Open: frontend/index.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
pause


