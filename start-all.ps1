# AURORA CINEMA - Khởi chạy toàn bộ hệ thống
$root = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       AURORA CINEMA - KHOI CHAY TOAN BO HE THONG       " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiem tra va khoi dong WampServer neu chua chay
$wampProc = Get-Process -Name "wampmanager" -ErrorAction SilentlyContinue
if (-not $wampProc) {
    $wampPath = "$root\..\..\wampmanager.exe"
    if (Test-Path $wampPath) {
        Write-Host "[0/4] Dang khoi dong WampServer (Apache + MySQL)..." -ForegroundColor Yellow
        Start-Process $wampPath
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "[OK] WampServer da san sang." -ForegroundColor Green
}

# 2. Khoi dong 4 phan he Frontend
Write-Host "[1/4] Khoi dong Customer Web (Cong 3000)..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$host.ui.RawUI.WindowTitle = 'AURORA - Customer Web (3000)'; npm.cmd run dev -- --port 3000 --host" -WorkingDirectory "$root\customer\frontend"

Write-Host "[2/4] Khoi dong POS System (Cong 5174)..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$host.ui.RawUI.WindowTitle = 'AURORA - POS System (5174)'; npm.cmd run dev -- --port 5174 --host" -WorkingDirectory "$root\pos\frontend"

Write-Host "[3/4] Khoi dong TMS System (Cong 5175)..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$host.ui.RawUI.WindowTitle = 'AURORA - TMS System (5175)'; npm.cmd run dev -- --port 5175 --host" -WorkingDirectory "$root\tms\frontend"

Write-Host "[4/4] Khoi dong EMS System (Cong 5176)..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$host.ui.RawUI.WindowTitle = 'AURORA - EMS System (5176)'; npm.cmd run dev -- --port 5176 --host" -WorkingDirectory "$root\ems\frontend"

# 3. Tu dong mo trinh duyet
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DA KHOI CHAY TAT CA CAC PHAN HE THANH CONG:" -ForegroundColor Yellow
Write-Host "  - Customer Web : http://localhost:3000 (Dang mo tren trinh duyet)" -ForegroundColor White
Write-Host "  - POS System   : http://localhost:5174" -ForegroundColor White
Write-Host "  - TMS System   : http://localhost:5175" -ForegroundColor White
Write-Host "  - EMS System   : http://localhost:5176" -ForegroundColor White
Write-Host "  - Backend APIs : http://localhost/AURORA%20CINEMA/ (WAMP Apache)" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Meo: Chay file 'stop-all.bat' hoac 'npm run stop' de dung toan bo." -ForegroundColor Yellow
Write-Host ""
Write-Host "Cua so nay se tu dong dong sau 5 giay..." -ForegroundColor Gray
Start-Sleep -Seconds 5
