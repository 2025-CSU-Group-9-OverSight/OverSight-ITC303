@echo off
echo 🚀 Installing OverSight-ITC303 dependencies...

echo.
echo 📦 Installing root dependencies (commitizen, standard-version)...
npm install
if errorlevel 1 (
    echo ❌ Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo 🖥️  Installing server dependencies...
cd Server
npm install
if errorlevel 1 (
    echo ❌ Failed to install server dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo 🐍 Installing monitoring dependencies...
cd MonitoringScript
poetry install
if errorlevel 1 (
    echo ⚠️  Poetry not found or failed. Please install Poetry from https://python-poetry.org/
    echo    Then run: cd MonitoringScript ^&^& poetry install
) else (
    echo ✅ Poetry dependencies installed successfully!
)
cd ..

echo.
echo 🎉 Installation complete!
echo 📖 See docs/DEVELOPMENT_GUIDE.md for next steps
pause