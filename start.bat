@echo off
title Smart Bachatgat - Starting...
color 0A
echo.
echo  =====================================================
echo    SMART BACHATGAT - AUTO START
echo  =====================================================
echo.

:: Step 1 - Start PostgreSQL
echo [1/3] Starting PostgreSQL database...
net start postgresql-x64-13 >nul 2>&1
if %errorlevel% neq 0 (
  net start postgresql-x64-15 >nul 2>&1
)
if %errorlevel% neq 0 (
  net start postgresql >nul 2>&1
)
echo  PostgreSQL started (or was already running)
timeout /t 2 >nul

:: Step 2 - Start Backend
echo [2/3] Starting Backend (Python/FastAPI)...
start "Smart Bachatgat - BACKEND" cmd /k "cd /d "%~dp0smart-bachatgat-backend" && echo Backend starting on port 8000... && python -m uvicorn main:app --reload --port 8000"
timeout /t 5 >nul

:: Step 3 - Start Frontend
echo [3/3] Starting Frontend (React/Vite)...
start "Smart Bachatgat - FRONTEND" cmd /k "cd /d "%~dp0" && echo Frontend starting... && npm run dev"
timeout /t 4 >nul

echo.
echo  =====================================================
echo    ALL STARTED! Open your browser:
echo    http://localhost:5173  or  http://localhost:5174
echo  =====================================================
echo.
pause