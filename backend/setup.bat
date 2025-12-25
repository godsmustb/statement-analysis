@echo off
echo ========================================
echo  PDF Parser Backend Setup (Windows)
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/4] Python found - Creating virtual environment...
python -m venv venv

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo [4/4] Setup complete!
echo.
echo ========================================
echo  IMPORTANT: Install Ghostscript
echo ========================================
echo.
echo Camelot requires Ghostscript to process PDFs.
echo Download from: https://ghostscript.com/releases/gsdnld.html
echo Install the 64-bit version and add to PATH
echo.
echo ========================================
echo  To start the server:
echo ========================================
echo.
echo 1. Activate virtual environment:
echo    venv\Scripts\activate
echo.
echo 2. Run the server:
echo    python app.py
echo.
echo Server will run at: http://localhost:5000
echo ========================================
pause
