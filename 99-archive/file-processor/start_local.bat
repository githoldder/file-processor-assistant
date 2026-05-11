@echo off
chcp 65001 >nul
title 文件处理全能助手 - 本地版

echo ========================================
echo    文件处理全能助手 - 本地版
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未安装Python，请先安装Python 3.8+
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo [信息] 正在创建虚拟环境...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo [信息] 正在安装依赖...
pip install -r backend\requirements.txt --quiet

REM Check for LibreOffice
where libreoffice >nul 2>&1
if errorlevel 1 (
    echo [警告] 未找到LibreOffice，部分功能可能不可用
    echo [提示] 请安装LibreOffice: https://www.libreoffice.org/download/download/
)

REM Check for Pandoc
where pandoc >nul 2>&1
if errorlevel 1 (
    echo [警告] 未找到Pandoc，部分功能可能不可用
    echo [提示] 请安装Pandoc: https://pandoc.org/installing.html
)

echo.
echo [信息] 启动服务...
echo [提示] 服务启动后，浏览器将自动打开 http://localhost:8000
echo [提示] 按 Ctrl+C 停止服务
echo.

REM Start backend
start "API服务" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
start "前端界面" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Open browser
start http://localhost:8000

echo.
echo 服务已启动！
echo.
pause
