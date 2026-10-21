@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%" || exit /b 1

echo Dang dung Redis Docker containers...
docker compose down
echo Da dung tat ca containers.
