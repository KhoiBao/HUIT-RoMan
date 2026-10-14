@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%backend" || exit /b 1

echo API:     http://localhost:5056
echo Swagger: http://localhost:5056/swagger
echo Health:  http://localhost:5056/api/health
dotnet run --project src/API --launch-profile http
