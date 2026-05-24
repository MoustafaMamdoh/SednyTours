@echo off
title Sydney Tours - Accounting System
color 0B
echo ===================================================
echo     Starting Sydney Tours Accounting System
echo ===================================================

:: Start Backend in a new hidden/minimized window or just start it
echo [1] Starting Backend (FastAPI)...
start "Sydney Tours - Backend" cmd /c "cd /d %~dp0backend && python -m uvicorn main:app --port 8000"

:: Wait 3 seconds to let backend initialize
timeout /t 3 /nobreak > nul

:: Start Frontend
echo [2] Starting Frontend (Vite/React)...
start "Sydney Tours - Frontend" cmd /c "cd /d %~dp0 && npm run dev"

:: Open Browser
echo [3] Opening Browser...
timeout /t 2 /nobreak > nul
start http://localhost:5173/

echo ===================================================
echo     System is running! You can close this window.
echo ===================================================
timeout /t 5 /nobreak > nul
exit
