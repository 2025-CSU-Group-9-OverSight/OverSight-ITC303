@echo off
setlocal

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="dev" goto dev
if "%1"=="build" goto build
if "%1"=="start" goto start
if "%1"=="lint" goto lint
if "%1"=="test" goto test
if "%1"=="commit" goto commit
if "%1"=="release" goto release
if "%1"=="run-monitor" goto run-monitor
if "%1"=="clean" goto clean

echo ❌ Unknown command: %1
echo Run 'dev.bat help' to see available commands
goto end

:help
echo 🆘 Available commands:
echo   install      - Install all dependencies
echo   dev          - Start development server
echo   build        - Build application
echo   start        - Start production server
echo   lint         - Lint all components
echo   test         - Run all tests
echo   commit       - Make conventional commit
echo   release      - Create release
echo   run-monitor  - Run monitoring scripts
echo   clean        - Clean build artifacts
echo   help         - Show this help
echo.
echo Usage: dev.bat ^<command^>
goto end

:install
echo 🚀 Installing all dependencies...
call install.bat
goto end

:dev
echo 🖥️  Starting NextJS development server...
cd Server
npm run dev
cd ..
goto end

:build
echo 🔨 Building application...
cd Server
npm run build
cd ..
goto end

:start
echo 🚀 Starting production server...
cd Server
npm run start
cd ..
goto end

:lint
echo 🧹 Linting all components...
cd MonitoringScript
poetry run black .
poetry run flake8 .
cd ..\Server
npm run lint
cd ..
goto end

:test
echo 🧪 Running all tests...
cd MonitoringScript
poetry run pytest
cd ..\Server
npm test
cd ..
goto end

:commit
echo 📝 Making conventional commit...
npm run commit
goto end

:release
echo 🎉 Creating release...
npm run release
goto end

:run-monitor
echo 📊 Running monitoring scripts...
cd MonitoringScript
poetry run python -m oversight_monitoring.system_monitor
cd ..
goto end

:clean
echo 🧹 Cleaning build artifacts...
if exist node_modules rmdir /s /q node_modules
if exist Server\node_modules rmdir /s /q Server\node_modules
if exist Server\.next rmdir /s /q Server\.next
if exist Server\out rmdir /s /q Server\out
cd MonitoringScript
poetry env remove --all
cd ..
goto end

:end
endlocal