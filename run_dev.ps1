# PowerShell 1-Click Startup Script for He Thong Ban Hang Da Kenh
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  KHOI DONG TRON BO HE THONG BAN HANG DA KENH (REALTIME 100%)       " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan

$baseDir = Get-Location

Write-Host "`n[1/3] Dang khoi dong FastAPI Backend & PostgreSQL (Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\backend'; python -m uvicorn app.main:app --reload"

Write-Host "[2/3] Dang khoi dong Web Ban Hang Customer Storefront (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\frontend'; npm run dev"

Write-Host "[3/3] Dang khoi dong Web Quan Ly Admin Panel (Port 5174)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\Multi-channel Sales Management Web'; npm run dev"

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "  DA KHOI DONG THANH CONG ALL 3 SERVICES!                           " -ForegroundColor Green
Write-Host "  - 1. Backend API & Docs  : http://localhost:8000/docs                 " -ForegroundColor White
Write-Host "  - 2. Web Ban Hang (Khach): http://localhost:5173                        " -ForegroundColor White
Write-Host "  - 3. Web Quan Ly (Admin) : http://localhost:5174/login                  " -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
