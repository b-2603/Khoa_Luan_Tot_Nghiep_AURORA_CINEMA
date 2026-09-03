# Script PowerShell khởi chạy toàn bộ hệ thống AURORA CINEMA cùng 1 lúc

$root = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       AURORA CINEMA - KHỞI CHẠY TOÀN BỘ HỆ THỐNG       " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Khởi động Customer Web (Cổng 3000)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\customer\frontend`" && npm.cmd run dev -- --port 3000 --host" -WindowStyle Minimized

Write-Host "[2/4] Khởi động POS System (Cổng 5174)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\pos\frontend`" && npm.cmd run dev -- --port 5174 --host" -WindowStyle Minimized

Write-Host "[3/4] Khởi động TMS System (Cổng 5175)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\tms\frontend`" && npm.cmd run dev -- --port 5175 --host" -WindowStyle Minimized

Write-Host "[4/4] Khởi động EMS System (Cổng 5176)..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\ems\frontend`" && npm.cmd run dev -- --port 5176 --host" -WindowStyle Minimized

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ĐÃ KHỞI CHẠY TẤT CẢ CÁC PHÂN HỆ THÀNH CÔNG:" -ForegroundColor Yellow
Write-Host "  - 🎬 Customer Web : http://localhost:3000" -ForegroundColor White
Write-Host "  - 🛒 POS System   : http://localhost:5174" -ForegroundColor White
Write-Host "  - 📽️ TMS System   : http://localhost:5175" -ForegroundColor White
Write-Host "  - 🏢 EMS System   : http://localhost:5176" -ForegroundColor White
Write-Host "  - ⚡ Backend APIs : http://localhost/AURORA%20CINEMA/ (WAMP Apache)" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
