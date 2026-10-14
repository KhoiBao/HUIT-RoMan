@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%backend" || exit /b 1

dotnet ef database update --project src/Infrastructure --startup-project src/API
if errorlevel 1 (
  echo [LOI] Khong tao duoc DB. Kiem tra: PostgreSQL co chay khong, da tao DB LibraryDb chua,
  echo      user/pass co dung voi backend\src\API\appsettings.json khong.
  exit /b 1
)
echo OK. Da tao bang + seed tai khoan demo, xem chi tiet o backend\account.md
