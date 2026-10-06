@echo off
rem Whisker Edge dev launcher. Double-click it, or run it from a terminal.
rem
rem   dev.bat            -> npm run dev      the overlay, with reload on save
rem   dev.bat build      -> npm run build
rem   dev.bat test       -> npm run test
rem   dev.bat typecheck  -> npm run typecheck
rem
rem npm.cmd is deliberate: PowerShell blocks npm.ps1 on this machine.
rem npm run dev already strips ELECTRON_RUN_AS_NODE via scripts/run.mjs.
setlocal
cd /d "%~dp0"

set SCRIPT=%~1
if "%SCRIPT%"=="" set SCRIPT=dev

where node >nul 2>nul
if errorlevel 1 (
  echo Node is not on PATH. Install Node 20 or newer, reopen this window, try again.
  goto :fail
)

if not exist "node_modules\" (
  echo First run: installing dependencies...
  call npm.cmd install || goto :fail
)

rem npm blocks install scripts here, so Electron's binary is fetched by hand.
if not exist "node_modules\electron\dist\electron.exe" (
  echo Fetching the Electron binary...
  call node "node_modules\electron\install.js" || goto :fail
)

echo Running: npm run %SCRIPT%
call npm.cmd run %SCRIPT%
if errorlevel 1 goto :fail

endlocal
exit /b 0

:fail
echo.
echo "npm run %SCRIPT% failed - see the output above."
pause
endlocal
exit /b 1