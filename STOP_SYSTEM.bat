@echo off
setlocal
cd /d "%~dp0"
title Gym System - Stopping

echo ==========================================================
echo   Stopping your Gym Management System
echo ==========================================================
echo.

docker compose down

echo.
echo ==========================================================
echo   The system has stopped. Your data is safe.
echo   Run START_SYSTEM.bat whenever you want to use it again.
echo ==========================================================
echo.
pause
