@echo off
REM OverSight 'make' command for Windows
REM This allows you to use 'make' just like on Linux/macOS

if exist "dev.bat" (
    call dev.bat %*
) else (
    echo ❌ dev.bat not found. Are you in the OverSight-ITC303 directory?
    exit /b 1
)