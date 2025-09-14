@echo off
echo.
echo ============================================
echo        Quiz Application Setup
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    echo After installation:
    echo 1. Close this window
    echo 2. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed!
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not available!
    pause
    exit /b 1
)

echo [OK] npm is available!
npm --version

echo.
echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Setup completed successfully!
echo.
echo To start the quiz application:
echo   npm start
echo.
echo Then open: http://localhost:3000
echo.
pause
