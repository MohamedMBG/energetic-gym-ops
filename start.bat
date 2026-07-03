@echo off
cd /d "%~dp0"
start "" /min cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:5173"
call npm run dev:local
pause
