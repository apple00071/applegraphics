@echo off
title AppleGraphics Print Server
color 0A
echo ===================================================
echo   AppleGraphics Print Bridge Service
echo   Please keep this window open to process print jobs
echo ===================================================
echo.
cd /d "%~dp0"
:loop
echo [%TIME%] Starting Print Server...
call node start-print-server.js
echo.
echo ⚠️ Server stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
