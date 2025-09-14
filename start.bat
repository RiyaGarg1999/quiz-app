@echo off
echo.
echo ============================================
echo        Starting Quiz Application
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first by running setup.bat
    echo Or download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo Starting the quiz application...
echo.
echo The application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

node server.js

