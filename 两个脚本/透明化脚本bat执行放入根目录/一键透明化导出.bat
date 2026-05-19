@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=%SCRIPT_DIR:~0,-1%"

node "%SCRIPT_DIR%patch-export.js" "%TARGET%"
exit /b %errorlevel%
