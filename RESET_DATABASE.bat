@echo off
setlocal
cd /d "%~dp0"
title Gym System - Reset Database

echo ==========================================================
echo   WARNING - RESET DATABASE
echo ==========================================================
echo.
echo   This will PERMANENTLY DELETE ALL DATA:
echo   all clients, payments, packs, offers and settings.
echo.
echo   This cannot be undone.
echo.
set /p CONFIRM=Type  YES  to erase everything, or anything else to cancel:

if /i not "%CONFIRM%"=="YES" (
  echo.
  echo   Cancelled. Nothing was deleted.
  echo.
  pause
  exit /b 0
)

echo.
echo [i] Deleting all data and rebuilding a fresh system...
docker compose down -v
docker compose up --build -d
if errorlevel 1 (
  echo.
  echo [X] Something went wrong. Make sure Docker Desktop is running.
  echo.
  pause
  exit /b 1
)

echo.
echo [i] Opening the app in your browser...
timeout /t 12 /nobreak >nul
start "" http://localhost:5173

echo.
echo ==========================================================
echo   Done. The database is fresh and empty.
echo   Login email:     admin@gym.local
echo   Login password:  admin12345
echo ==========================================================
echo.
pause
