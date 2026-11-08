@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"

rem 
if exist "%ROOT%.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ROOT%.env") do set "%%a=%%b"
) else (
  echo [CANH BAO] Khong tim thay file .env o thu muc goc. Copy .env.example thanh .env roi dien gia tri.
)

if not defined DB_PORT set "DB_PORT=5433"
set "ConnectionStrings__DefaultConnection=Host=localhost;Port=%DB_PORT%;Database=%POSTGRES_DB%;Username=%POSTGRES_USER%;Password=%POSTGRES_PASSWORD%"
set "JwtSettings__Secret=%JWT_SECRET%"
set "JwtSettings__Issuer=HUIT-RoMan-API"
set "JwtSettings__Audience=HUIT-RoMan-Client"

cd /d "%ROOT%backend" || exit /b 1

dotnet ef database update --project src/Infrastructure --startup-project src/API
if errorlevel 1 (
  echo [LOI] Khong tao duoc DB. Kiem tra: PostgreSQL co chay khong, da tao DB LibraryDb chua,
  echo      POSTGRES_PASSWORD trong file .env co dung khong.
  exit /b 1
)

dotnet run --project src/API --no-build -- --seed-only
if errorlevel 1 (
  echo [CANH BAO] Khong the chay seeder tu dong. Seeder se chay khi ban bat backend.
)

echo OK. Da tao bang + seed tai khoan demo, xem chi tiet o backend\account.md
