@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%" || exit /b 1

echo ===================================================
echo   KHOI DONG REDIS SERVER (DOCKER) CHO HUIT-ROMAN
echo ===================================================
docker compose up -d
if errorlevel 1 (
    echo [LOI] Khong the khoi dong Redis Docker. Vui long kiem tra Docker Desktop da mo.
    pause
    exit /b 1
)

echo.
echo [THANH CONG] Redis da san sang!
echo  - Redis Server:    localhost:6379
echo  - Redis Commander: http://localhost:8081 (Giao dien quan ly truc quan)
echo.
