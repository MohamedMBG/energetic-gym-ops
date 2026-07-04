@echo off
setlocal
cd /d "%~dp0"
title Gym System - Starting

echo ==========================================================
echo   Starting your Gym Management System
echo ==========================================================
echo.

REM --- Check Docker is installed ---
docker --version >nul 2>&1
if errorlevel 1 (
  echo [X] Docker is not installed.
  echo.
  echo     Please install "Docker Desktop" first, then run this again.
  echo     Download: https://www.docker.com/products/docker-desktop/
  echo.
  pause
  exit /b 1
)

REM --- Check Docker Desktop is running ---
docker info >nul 2>&1
if errorlevel 1 (
  echo [X] Docker Desktop is not running.
  echo.
  echo     Please open "Docker Desktop", wait until it says "Running",
  echo     then start this again.
  echo.
  pause
  exit /b 1
)

REM --- Create settings file on first run ---
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [i] Created your settings file: .env
)

echo [i] Preparing the system. The FIRST time can take a few minutes.
echo     Please keep this window open and wait...
echo.

docker compose up --build -d
if errorlevel 1 (
  echo.
  echo [X] Something went wrong while starting.
  echo     Make sure Docker Desktop is running, then try again.
  echo.
  pause
  exit /b 1
)

echo.
echo [i] Almost ready, opening the app in your browser...
timeout /t 12 /nobreak >nul
start "" http://localhost:5173

echo.
echo ==========================================================
echo   The system is running!
echo.
echo   Open in your browser:  http://localhost:5173
echo   Login email:           admin@gym.local
echo   Login password:        admin12345
echo.
echo   To stop it later, run STOP_SYSTEM.bat
echo ==========================================================
echo.
pause
