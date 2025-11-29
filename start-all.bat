@echo off
echo Starting Backend and Frontend...
echo.
echo Starting Backend in new window...
start "RWA Backend" cmd /k "cd ev-guardian-platform && python backend_api.py"
timeout /t 3 /nobreak >nul
echo Starting Frontend in new window...
start "RWA Frontend" cmd /k "pnpm dev"
echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
pause

