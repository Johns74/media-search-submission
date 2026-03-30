@echo off
echo Starting Media Search Submission...
echo.
echo 1. Launching local development server...
start /min cmd /K "npm.cmd run dev"

echo 2. Opening your browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173/media-search-submission/
echo.
echo Done! Please keep this window open while using the program.
pause
