@echo off
title He Thong Ban Hang Da Kanh - Startup Script
echo ====================================================================
echo   KHOI DONG TRON BO HE THONG BAN HANG DA KENH (REALTIME 100%)
echo ====================================================================
echo.

echo [1/3] Dang khoi dong FastAPI Backend & PostgreSQL (Port 8000)...
start "FastAPI Backend - Port 8000" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload"

echo [2/3] Dang khoi dong Web Ban Hang Storefront (Port 5173)...
start "Web Ban Hang Customer Storefront - Port 5173" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Dang khoi dong Web Quan Ly Admin Panel (Port 5174)...
start "Web Quan Ly Admin Panel - Port 5174" cmd /k "cd /d "%~dp0Multi-channel Sales Management Web" && npm run dev"

echo.
echo ====================================================================
echo   DA KHOI DONG THANH CONG ALL 3 SERVICES!
echo   - 1. Backend API & Docs  : http://localhost:8000/docs
echo   - 2. Web Ban Hang (Khach): http://localhost:5173
echo   - 3. Web Quan Ly (Admin) : http://localhost:5174/login
echo.
echo   Tai khoan Quan Ly (Admin Web):
echo   - Admin    : admin@hethong.vn / 123
echo   - Sales    : sales@hethong.vn / 123
echo   - Warehouse: warehouse@hethong.vn / 123
echo ====================================================================
pause
