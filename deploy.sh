#!/usr/bin/env bash

# Deploy EcoShop to GitHub (run locally)
# Usage:
#   gh auth login && ./deploy.sh
#   OR
#   export GITHUB_TOKEN="ghp_xxxx"
#   export GITHUB_REPO="yourname/ecoshop-ecommerce"
#   ./deploy.sh

set -e

REPO="${1:-$GITHUB_REPO}"

if [ -z "$REPO" ]; then
  echo "Usage: ./deploy.sh <owner/repo>"
  echo "Or: export GITHUB_REPO='owner/repo' && ./deploy.sh"
  exit 1
fi

if command -v gh >/dev/null 2>&1; then
  echo "✓ Using GitHub CLI"
  git init >/dev/null 2>&1 || true
  git add .
  git commit -m "EcoShop: Professional multi-vendor e-commerce platform" || true
  git remote add origin "https://github.com/$REPO.git" 2>/dev/null || git remote set-url origin "https://github.com/$REPO.git"
  git branch -M main
  git push -u origin main
  echo "✓ Successfully pushed to https://github.com/$REPO"
  exit 0
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "✗ gh CLI not found. Set GITHUB_TOKEN to continue."
  exit 1
fi

echo "✓ Using GITHUB_TOKEN"
REMOTE_URL="https://$GITHUB_TOKEN@github.com/$REPO.git"
git init >/dev/null 2>&1 || true
git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
git add .
git commit -m "EcoShop: Professional multi-vendor e-commerce platform" || true
git branch -M main
git push -u origin main
echo "✓ Successfully pushed to https://github.com/$REPO"
