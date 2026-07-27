<#
.SYNOPSIS
Deploy EcoShop to GitHub repository (run locally).
.DESCRIPTION
Uses gh CLI (recommended) or GITHUB_TOKEN environment variable to push code.
.EXAMPLE
  # Using gh CLI (interactive login)
  gh auth login
  ./deploy.ps1
  
  # Or with token (set locally, never commit)
  $env:GITHUB_TOKEN = "ghp_xxxx"
  $env:GITHUB_REPO = "yourname/ecoshop-ecommerce"
  ./deploy.ps1
.NOTES
Never commit tokens to git. Use environment variables only.
#>

param([string]$RepoUrl)

$repo = $RepoUrl -or $env:GITHUB_REPO
if (-not $repo) {
  Write-Host "Usage: ./deploy.ps1 -RepoUrl 'yourname/ecoshop-ecommerce'" -ForegroundColor Cyan
  Write-Host "Or set \$env:GITHUB_REPO before running." -ForegroundColor Cyan
  exit 1
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  Write-Host "✓ Using GitHub CLI" -ForegroundColor Green
  git init 2>$null | Out-Null
  git add .
  git commit -m "EcoShop: Professional multi-vendor e-commerce platform" -q
  git remote add origin "https://github.com/$repo.git" -q 2>$null
  git branch -M main
  git push -u origin main
  Write-Host "✓ Successfully pushed to https://github.com/$repo" -ForegroundColor Green
  exit 0
}

if (-not $env:GITHUB_TOKEN) {
  Write-Host "✗ gh CLI not found. Set GITHUB_TOKEN environment variable to continue." -ForegroundColor Red
  exit 1
}

Write-Host "✓ Using GITHUB_TOKEN" -ForegroundColor Green
$remote = "https://$($env:GITHUB_TOKEN)@github.com/$repo.git"
git init 2>$null | Out-Null
if (-not (git config --get remote.origin.url 2>$null)) { git remote add origin $remote -q } else { git remote set-url origin $remote -q }
git add .
git commit -m "EcoShop: Professional multi-vendor e-commerce platform" -q
git branch -M main
git push -u origin main
Write-Host "✓ Successfully pushed to https://github.com/$repo" -ForegroundColor Green
