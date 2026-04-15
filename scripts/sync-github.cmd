@echo off
setlocal EnableExtensions

REM ASCII-only batch file for stable parsing in cmd.exe
REM Usage:
REM   Double-click this file
REM   or run: sync-github.cmd your commit message

cd /d "%~dp0.."
if not exist ".git" (
  echo [ERROR] .git not found. Put this file under repo\scripts\ .
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git is not in PATH.
  pause
  exit /b 1
)

title GitHub Sync
echo Repo: %CD%
echo.

git add -A
git diff --cached --quiet
if errorlevel 1 (
  if "%~1"=="" (
    git commit -m "chore: sync"
  ) else (
    git commit -m "%*"
  )
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo No local changes to commit.
)

echo.
echo Pushing to origin/main ...
git push origin main
if errorlevel 1 (
  echo [ERROR] git push origin main failed.
  pause
  exit /b 1
)

echo.
git remote get-url firedragon >nul 2>nul
if errorlevel 1 (
  echo firedragon remote not found. Skipped.
) else (
  echo Pushing to firedragon/main ...
  git push firedragon main
  if errorlevel 1 (
    echo [ERROR] git push firedragon main failed.
    pause
    exit /b 1
  )
)

echo.
echo Done.
pause
endlocal
