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

rem ── Đưa cấu hình vào biến môi trường cho ASP.NET Core ──
if not defined DB_PORT set "DB_PORT=5433"
set "ConnectionStrings__DefaultConnection=Host=localhost;Port=%DB_PORT%;Database=%POSTGRES_DB%;Username=%POSTGRES_USER%;Password=%POSTGRES_PASSWORD%"
set "JwtSettings__Secret=%JWT_SECRET%"
set "JwtSettings__Issuer=HUIT-RoMan-API"
set "JwtSettings__Audience=HUIT-RoMan-Client"
if defined SMTP_USER set "SmtpSettings__UserName=%SMTP_USER%"
if defined SMTP_PASSWORD set "SmtpSettings__Password=%SMTP_PASSWORD%"
if defined SMTP_SENDER_EMAIL set "SmtpSettings__SenderEmail=%SMTP_SENDER_EMAIL%"
if defined SMTP_SENDER_NAME set "SmtpSettings__SenderName=%SMTP_SENDER_NAME%"
if defined SMTP_ENABLE_EMAIL set "SmtpSettings__EnableEmail=%SMTP_ENABLE_EMAIL%"
if not defined MINIO_ENDPOINT set "MINIO_ENDPOINT=localhost:9000"
set "StorageSettings__Endpoint=%MINIO_ENDPOINT%"
if defined MINIO_ROOT_USER set "StorageSettings__AccessKey=%MINIO_ROOT_USER%"
if defined MINIO_ROOT_PASSWORD set "StorageSettings__SecretKey=%MINIO_ROOT_PASSWORD%"

cd /d "%ROOT%backend" || exit /b 1

echo API:     http://localhost:5056
echo Swagger: http://localhost:5056/swagger
echo Health:  http://localhost:5056/api/health

dotnet run --project src/API --launch-profile http
