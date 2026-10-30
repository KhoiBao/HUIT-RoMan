@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "PORT=5173"
cd /d "%ROOT%" || exit /b 1

echo ========================================================
echo   PUBLIC HUIT-ROMAN RA INTERNET BANG CLOUDFLARE TUNNEL
echo ========================================================
echo.

rem Tim cloudflared: uu tien file trong thu muc project, sau do den PATH.
set "CF=%ROOT%cloudflared.exe"
if not exist "%CF%" (
    for /f "delims=" %%i in ('where cloudflared 2^>nul') do set "CF=%%i"
)
if not exist "%CF%" (
    echo [LOI] Khong tim thay cloudflared.exe.
    echo.
    echo   Cach 1: cai bang winget -^> winget install --id Cloudflare.cloudflared
    echo   Cach 2: tai file cloudflared-windows-amd64.exe tai
    echo           https://github.com/cloudflare/cloudflared/releases
    echo           roi doi ten thanh cloudflared.exe va dat vao thu muc nay.
    echo.
    pause
    exit /b 1
)

rem Can web dang chay o cong 5173 (docker compose hoac npm run dev).
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [CANH BAO] Khong thay dich vu nao lang nghe o cong %PORT%.
    echo   Bat web truoc bang: docker compose up -d   ^(hoac run-web.bat^)
    echo.
    pause
    exit /b 1
)

echo Dang mo Cloudflare Tunnel toi http://127.0.0.1:%PORT% ...
echo Link HTTPS public se xuat hien ben duoi (dang https://*.trycloudflare.com).
echo Giu cua so nay mo trong suot thoi gian chia se.
echo.
"%CF%" tunnel --url http://127.0.0.1:%PORT%
pause
