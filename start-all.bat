@echo off
chcp 65001 > nul
title AURORA CINEMA - FULL SYSTEM STARTER

echo ========================================================
echo        AURORA CINEMA - KHỞI CHẠY TOÀN BỘ HỆ THỐNG
echo ========================================================
echo.
echo [1/4] Khởi động Customer Web (Cổng 3000)...
start "AURORA Customer Web" cmd /k "cd /d "%~dp0customer\frontend" && npm.cmd run dev -- --port 3000 --host"

echo [2/4] Khởi động POS System (Cổng 5174)...
start "AURORA POS System" cmd /k "cd /d "%~dp0pos\frontend" && npm.cmd run dev -- --port 5174 --host"

echo [3/4] Khởi động TMS System (Cổng 5175)...
start "AURORA TMS System" cmd /k "cd /d "%~dp0tms\frontend" && npm.cmd run dev -- --port 5175 --host"

echo [4/4] Khởi động EMS System (Cổng 5176)...
start "AURORA EMS System" cmd /k "cd /d "%~dp0ems\frontend" && npm.cmd run dev -- --port 5176 --host"

echo.
echo ========================================================
echo   TẤT CẢ CÁC PHÂN HỆ ĐANG ĐƯỢC CHẠY TRONG NỀN:
echo   - Customer Web : http://localhost:3000
echo   - POS System   : http://localhost:5174
echo   - TMS System   : http://localhost:5175
echo   - EMS System   : http://localhost:5176
echo   - Backend APIs : Đang phục vụ qua Apache WAMP (Port 80/3306)
echo ========================================================
echo.
pause
