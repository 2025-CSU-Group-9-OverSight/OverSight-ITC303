# OverSight-ITC303 Development Scripts for Windows
# Run with: .\dev.ps1 <command>

param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

switch ($Command) {
    "install" {
        Write-Host "🚀 Installing all dependencies..." -ForegroundColor Green
        & .\install.ps1
    }
    "dev" {
        Write-Host "🖥️  Starting NextJS development server..." -ForegroundColor Green
        Set-Location Server
        npm run dev
    }
    "build" {
        Write-Host "🔨 Building application..." -ForegroundColor Green
        Set-Location Server
        npm run build
    }
    "start" {
        Write-Host "🚀 Starting production server..." -ForegroundColor Green
        Set-Location Server
        npm run start
    }
    "lint" {
        Write-Host "🧹 Linting all components..." -ForegroundColor Green
        Set-Location MonitoringScript
        poetry run black .
        poetry run flake8 .
        Set-Location ../Server
        npm run lint
        Set-Location ..
    }
    "test" {
        Write-Host "🧪 Running all tests..." -ForegroundColor Green
        Set-Location MonitoringScript
        poetry run pytest
        Set-Location ../Server
        npm test
        Set-Location ..
    }
    "commit" {
        Write-Host "📝 Making conventional commit..." -ForegroundColor Green
        npm run commit
    }
    "release" {
        Write-Host "🎉 Creating release..." -ForegroundColor Green
        npm run release
    }
    "run-monitor" {
        Write-Host "📊 Running monitoring scripts..." -ForegroundColor Green
        Set-Location MonitoringScript
        poetry run python -m oversight_monitoring.system_monitor
        Set-Location ..
    }
    "clean" {
        Write-Host "🧹 Cleaning build artifacts..." -ForegroundColor Green
        Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force Server/node_modules -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force Server/.next -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force Server/out -ErrorAction SilentlyContinue
        Set-Location MonitoringScript
        poetry env remove --all
        Set-Location ..
    }
    "help" {
        Write-Host "🆘 Available commands:" -ForegroundColor Cyan
        Write-Host "  install      - Install all dependencies" -ForegroundColor Yellow
        Write-Host "  dev          - Start development server" -ForegroundColor Yellow
        Write-Host "  build        - Build application" -ForegroundColor Yellow
        Write-Host "  start        - Start production server" -ForegroundColor Yellow
        Write-Host "  lint         - Lint all components" -ForegroundColor Yellow
        Write-Host "  test         - Run all tests" -ForegroundColor Yellow
        Write-Host "  commit       - Make conventional commit" -ForegroundColor Yellow
        Write-Host "  release      - Create release" -ForegroundColor Yellow
        Write-Host "  run-monitor  - Run monitoring scripts" -ForegroundColor Yellow
        Write-Host "  clean        - Clean build artifacts" -ForegroundColor Yellow
        Write-Host "  help         - Show this help" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Usage: .\dev.ps1 <command>" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
        Write-Host "Run '.\dev.ps1 help' to see available commands" -ForegroundColor Yellow
    }
}