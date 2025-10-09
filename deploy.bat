@echo off
echo 🚀 Starting deployment process...

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Please create one from .env.example
    echo    copy .env.example .env
    echo    # Then edit .env with your configuration
    pause
    exit /b 1
)

REM Validate configuration
echo 🔍 Validating configuration...
node -c server.js && node -c api/index.js && node -c api/wallet-management.js && node -c api/unified-drainer.js && node -c api/health.js
if %errorlevel% neq 0 (
    echo ❌ Validation failed
    pause
    exit /b 1
)
echo ✅ All files pass syntax validation

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 🔗 Your app is now live on Vercel
pause
