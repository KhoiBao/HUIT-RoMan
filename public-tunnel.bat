@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%" || exit /b 1

echo ========================================================
echo   PUBLIC HUIT-ROMAN RA INTERNET BANG CLOUDFLARE TUNNEL
echo ========================================================
echo.
echo Dang khoi tao Cloudflare Tunnel toi http://localhost:5173...
echo Link HTTPS public se xuat hien ben duoi (dang *.trycloudflare.com)
echo Khong can mat khau, ho tro WebSocket SignalR va API day du!
echo.
if exist "%ROOT%cloudflared.exe" (
    "%ROOT%cloudflared.exe" tunnel --url http://127.0.0.1:5173
) else (
    cloudflared tunnel --url http://127.0.0.1:5173
)
pause
