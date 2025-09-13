# Set Environment Variables in Vercel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setting Environment Variables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if user is logged in
Write-Host "Checking Vercel login status..." -ForegroundColor Yellow
try {
    $user = vercel whoami 2>$null
    Write-Host "Logged in as: $user" -ForegroundColor Green
} catch {
    Write-Host "Please login to Vercel first:" -ForegroundColor Red
    Write-Host "vercel login" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Yellow
Write-Host ""

# Set environment variables
Write-Host "Setting TELEGRAM_BOT_TOKEN..." -ForegroundColor Cyan
$botToken = Read-Host "Enter your Telegram Bot Token"
vercel env add TELEGRAM_BOT_TOKEN production

Write-Host ""
Write-Host "Setting TELEGRAM_CHAT_ID..." -ForegroundColor Cyan
$chatId = Read-Host "Enter your Telegram Chat ID"
vercel env add TELEGRAM_CHAT_ID production

Write-Host ""
Write-Host "Setting NODE_ENV..." -ForegroundColor Cyan
vercel env add NODE_ENV production

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Environment Variables Set!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your environment variables have been set for production." -ForegroundColor Yellow
Write-Host "You can view them in the Vercel dashboard under Settings > Environment Variables" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"
