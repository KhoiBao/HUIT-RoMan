@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%backend" || exit /b 1

echo Dang xoa toan bo du lieu va co so du lieu LibraryDb...
dotnet ef database drop -f --project src/Infrastructure --startup-project src/API
if errorlevel 1 (
  echo [LOI] Khong the drop database. Kiem tra PostgreSQL va dong backend neu dang chay.
  exit /b 1
)

echo Dang tao lai bang va chay migrations...
dotnet ef database update --project src/Infrastructure --startup-project src/API
if errorlevel 1 (
  echo [LOI] Khong the cap nhat database migrations.
  exit /b 1
)

echo Dang chay DB Seeder...
dotnet run --project src/API --no-build -- --seed-only
if errorlevel 1 (
  echo [CANH BAO] Khong the chay seeder tu dong. Seeder se tu dong chay khi khoi dong backend.
)

echo.
echo ========================================================
echo DA XOA VA KHOI TAO LAI TOAN BO DU LIEU CSDL THANH CONG!
echo Xem danh sach tai khoan demo tai backend\account.md
echo ========================================================
