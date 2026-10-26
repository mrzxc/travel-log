@echo off
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron runtime is missing. Please run pnpm install first.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo App build is missing. Please run pnpm build first.
  pause
  exit /b 1
)
start "" "node_modules\electron\dist\electron.exe" "%~dp0."
