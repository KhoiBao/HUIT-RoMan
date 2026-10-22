@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"

echo [1/4] Kiem tra .NET 8 SDK...
where dotnet >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua cai .NET 8 SDK. Tai tai: https://dotnet.microsoft.com/download
  exit /b 1
)
dotnet --version

echo [2/4] Kiem tra Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua cai Node.js LTS. Tai tai: https://nodejs.org
  exit /b 1
)
node --version

echo [3/4] Cai dotnet-ef neu thieu + restore backend...
dotnet ef --version >nul 2>&1
if errorlevel 1 dotnet tool install --global dotnet-ef
cd /d "%ROOT%backend" || exit /b 1
dotnet restore HUIT-RoMan.sln || exit /b 1

echo [4/4] Cai thu vien web...
cd /d "%ROOT%web" || exit /b 1
if not exist "node_modules" (
  npm install || exit /b 1
) else (
  echo Da co node_modules, bo qua npm install.
)

echo.
echo XONG. Buoc tiep theo:
echo  1. Bat PostgreSQL, tao DB trong ten LibraryDb
echo     user/pass xem tai backend\src\API\appsettings.json
echo  2. Chay run-redis.bat de bat Redis Docker (SignalR Realtime Backplane)
echo  3. Chay update-db.bat de tao bang + seed tai khoan demo
echo  4. Chay run-backend.bat roi run-web.bat
