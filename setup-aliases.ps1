# Setup Make Alias for OverSight Development
# Run this once to set up persistent 'make' alias in PowerShell

Write-Host "🔧 Setting up 'make' alias for OverSight development..." -ForegroundColor Green

# Create or update PowerShell profile
$profilePath = $PROFILE
$profileDir = Split-Path $profilePath -Parent

# Create profile directory if it doesn't exist
if (!(Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force
    Write-Host "✅ Created PowerShell profile directory" -ForegroundColor Yellow
}

# Define the alias function
$aliasFunction = @'

# OverSight Development Aliases
function make {
    param([string]$command = "help")
    
    if (Test-Path ".\dev.bat") {
        & ".\dev.bat" $command
    } elseif (Test-Path "dev.bat") {
        & "dev.bat" $command  
    } else {
        Write-Host "❌ dev.bat not found. Are you in the OverSight-ITC303 directory?" -ForegroundColor Red
    }
}

# Additional helpful aliases
Set-Alias -Name "oversight-dev" -Value "make"
Set-Alias -Name "os-dev" -Value "make"

'@

# Check if profile exists and if our aliases are already there
if (Test-Path $profilePath) {
    $profileContent = Get-Content $profilePath -Raw
    if ($profileContent -like "*OverSight Development Aliases*") {
        Write-Host "✅ OverSight aliases already configured in PowerShell profile" -ForegroundColor Green
        return
    }
}

# Add the alias function to the profile
Add-Content -Path $profilePath -Value $aliasFunction

Write-Host "✅ Added 'make' alias to PowerShell profile: $profilePath" -ForegroundColor Green
Write-Host "🔄 Please restart PowerShell or run: . `$PROFILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 You can now use:" -ForegroundColor Cyan
Write-Host "   make help" -ForegroundColor White
Write-Host "   make dev" -ForegroundColor White  
Write-Host "   make install" -ForegroundColor White
Write-Host "   make commit" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green