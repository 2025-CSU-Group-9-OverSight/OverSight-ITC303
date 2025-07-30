# OverSight-ITC303 Installation Script for Windows
# Run with: .\install.ps1

Write-Host "🚀 Installing OverSight-ITC303 dependencies..." -ForegroundColor Green

# Install root dependencies
Write-Host "📦 Installing root dependencies (commitizen, standard-version)..." -ForegroundColor Yellow
npm install

# Install server dependencies
Write-Host "🖥️  Installing server dependencies..." -ForegroundColor Yellow
Set-Location Server
npm install
Set-Location ..

# Install monitoring dependencies (if Poetry is available)
Write-Host "🐍 Installing monitoring dependencies..." -ForegroundColor Yellow
try {
    Set-Location MonitoringScript
    poetry install
    Set-Location ..
    Write-Host "✅ Poetry dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Poetry not found. Please install Poetry from https://python-poetry.org/" -ForegroundColor Red
    Write-Host "   Then run: cd MonitoringScript && poetry install" -ForegroundColor Yellow
    Set-Location ..
}

Write-Host "🎉 Installation complete!" -ForegroundColor Green
Write-Host "📖 See docs/DEVELOPMENT_GUIDE.md for next steps" -ForegroundColor Cyan