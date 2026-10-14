@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%web" || exit /b 1

where node >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua cai Node.js LTS. Tai tai: https://nodejs.org
  exit /b 1
)
if not exist "node_modules" (
  echo Chua co node_modules, dang chay npm install...
  npm install || exit /b 1
)

echo Web: http://localhost:5173
npm run dev -- --port 5173 --strictPort
