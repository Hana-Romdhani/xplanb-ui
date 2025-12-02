@echo off
REM Setup script for XPlanB Frontend (Windows)
REM This script helps set up the project for distribution

echo 🚀 Setting up XPlanB Frontend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if installation was successful
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Build the project
echo 🔨 Building the project...
npm run build

REM Check if build was successful
if %errorlevel% neq 0 (
    echo ❌ Build failed. Please check the errors above.
    pause
    exit /b 1
)

echo ✅ Build completed successfully

echo 🎉 Setup completed! You can now run:
echo    npm run dev    # Start development server
echo    npm run preview # Preview production build

pause
