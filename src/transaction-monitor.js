// Transaction Status Monitoring Enhancement
class TransactionMonitor {
  constructor() {
    this.monitoringTransactions = new Map();
    this.monitoringHistory = new Map();
    this.monitoringConfig = {
      checkInterval: 5000,        // 5 seconds between checks
      maxMonitoringTime: 300000,  // 5 minutes maximum monitoring
      maxAttempts: 20,            // Maximum status check attempts
      commitmentLevels: ['processed', 'confirmed', 'finalized']
    };
    
    // Monitoring configuration based on wallet value
    this.walletMonitoringTiers = {
      ULTRA_HIGH: { min: 1000000000, maxTime: 600000, checkInterval: 3000, maxAttempts: 30 },    // >1 SOL: 10min, 3s, 30 attempts
      VERY_HIGH: { min: 100000000, maxTime: 450000, checkInterval: 4000, maxAttempts: 25 },       // >0.1 SOL: 7.5min, 4s, 25 attempts
      HIGH: { min: 10000000, maxTime: 300000, checkInterval: 5000, maxAttempts: 20 },             // >0.01 SOL: 5min, 5s, 20 attempts
      MEDIUM: { min: 1000000, maxTime: 240000, checkInterval: 6000, maxAttempts: 15 },            // >0.001 SOL: 4min, 6s, 15 attempts
      LOW: { min: 0, maxTime: 180000, checkInterval: 8000, maxAttempts: 10 }                      // Default: 3min, 8s, 10 attempts
    };
    
    // Start monitoring cleanup interval
    this.startCleanupInterval();
  }

  // Start monitoring a transaction
  async startMonitoring(txid, connection, walletBalance = 0, context = {}) {
    const monitoringConfig = this.getMonitoringConfig(walletBalance);
    const monitoringId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[TRANSACTION_MONITOR] Starting monitoring for ${txid}`);
    console.log(`[TRANSACTION_MONITOR] Wallet tier: ${monitoringConfig.tier}, Max time: ${monitoringConfig.maxTime}ms, Check interval: ${monitoringConfig.checkInterval}ms`);
    
    const monitoringData = {
      id: monitoringId,
      txid: txid,
      connection: connection,
      startTime: Date.now(),
      config: monitoringConfig,
      context: context,
      status: 'monitoring',
      attempts: 0,
      lastStatus: null,
      statusHistory: [],
      finalStatus: null
    };
    
    this.monitoringTransactions.set(monitoringId, monitoringData);
    
    // Start the monitoring process
    this.monitorTransaction(monitoringId);
    
    return monitoringId;
  }

  // Get monitoring configuration for wallet balance
  getMonitoringConfig(balance) {
    let tier = 'LOW';
    
    // Determine tier based on balance
    for (const [tierName, config] of Object.entries(this.walletMonitoringTiers)) {
      if (balance >= config.min) {
        tier = tierName;
        break;
      }
    }
    
    return {
      tier: tier,
      balance: balance,
      maxTime: this.walletMonitoringTiers[tier].maxTime,
      checkInterval: this.walletMonitoringTiers[tier].checkInterval,
      maxAttempts: this.walletMonitoringTiers[tier].maxAttempts
    };
  }

  // Monitor transaction status
  async monitorTransaction(monitoringId) {
    const monitoringData = this.monitoringTransactions.get(monitoringId);
    if (!monitoringData) {
      console.log(`[TRANSACTION_MONITOR] Monitoring data not found for ID: ${monitoringId}`);
      return;
    }
    
    const { txid, connection, config, startTime } = monitoringData;
    let { attempts, statusHistory } = monitoringData;
    
    const monitoringInterval = setInterval(async () => {
      try {
        attempts++;
        monitoringData.attempts = attempts;
        
        // Check if monitoring time exceeded
        const elapsed = Date.now() - startTime;
        if (elapsed > config.maxTime) {
          console.log(`[TRANSACTION_MONITOR] Monitoring time exceeded for ${txid}: ${elapsed}ms > ${config.maxTime}ms`);
          this.finishMonitoring(monitoringId, 'TIMEOUT', { reason: 'Monitoring time exceeded', elapsed });
          clearInterval(monitoringInterval);
          return;
        }
        
        // Check if max attempts exceeded
        if (attempts > config.maxAttempts) {
          console.log(`[TRANSACTION_MONITOR] Max attempts exceeded for ${txid}: ${attempts} > ${config.maxAttempts}`);
          this.finishMonitoring(monitoringId, 'MAX_ATTEMPTS_EXCEEDED', { reason: 'Max attempts exceeded', attempts });
          clearInterval(monitoringInterval);
          return;
        }
        
        // Get transaction status
        const status = await this.getTransactionStatus(txid, connection, config.tier);
        monitoringData.lastStatus = status;
        monitoringData.statusHistory.push({
          timestamp: Date.now(),
          attempt: attempts,
          status: status.status,
          commitment: status.commitment,
          error: status.error
        });
        
        console.log(`[TRANSACTION_MONITOR] ${txid} attempt ${attempts}: ${status.status} (${status.commitment})`);
        
        // Check if transaction is finalized
        if (status.status === 'finalized') {
          console.log(`[TRANSACTION_MONITOR] ✅ Transaction ${txid} finalized successfully`);
          this.finishMonitoring(monitoringId, 'SUCCESS', { 
            status: 'finalized', 
            attempts: attempts, 
            elapsed: Date.now() - startTime 
          });
          clearInterval(monitoringInterval);
          return;
        }
        
        // Check if transaction is confirmed (for high-value wallets, wait for finalization)
        if (status.status === 'confirmed' && config.tier === 'LOW') {
          console.log(`[TRANSACTION_MONITOR] ✅ Transaction ${txid} confirmed (low-tier wallet)`);
          this.finishMonitoring(monitoringId, 'SUCCESS', { 
            status: 'confirmed', 
            attempts: attempts, 
            elapsed: Date.now() - startTime 
          });
          clearInterval(monitoringInterval);
          return;
        }
        
        // Check for failed status
        if (status.status === 'failed' || status.status === 'error') {
          console.log(`[TRANSACTION_MONITOR] ❌ Transaction ${txid} failed: ${status.error}`);
          this.finishMonitoring(monitoringId, 'FAILED', { 
            status: status.status, 
            error: status.error, 
            attempts: attempts 
          });
          clearInterval(monitoringInterval);
          return;
        }
        
        // Continue monitoring
        console.log(`[TRANSACTION_MONITOR] Continuing to monitor ${txid} (${status.status})`);
        
      } catch (error) {
        console.log(`[TRANSACTION_MONITOR] Error monitoring ${txid}: ${error.message}`);
        attempts++;
        monitoringData.attempts = attempts;
        
        // Add error to status history
        monitoringData.statusHistory.push({
          timestamp: Date.now(),
          attempt: attempts,
          status: 'error',
          commitment: 'unknown',
          error: error.message
        });
        
        // Continue monitoring unless too many errors
        if (attempts > config.maxAttempts) {
          this.finishMonitoring(monitoringId, 'ERROR_LIMIT_EXCEEDED', { 
            reason: 'Too many errors', 
            attempts: attempts,
            lastError: error.message 
          });
          clearInterval(monitoringInterval);
          return;
        }
      }
    }, config.checkInterval);
    
    // Store the interval reference for potential manual cleanup
    monitoringData.monitoringInterval = monitoringInterval;
  }

  // Get transaction status with retry logic
  async getTransactionStatus(txid, connection, tier) {
    try {
      // Try to get transaction with different commitment levels
      const commitmentLevels = tier === 'LOW' ? ['confirmed'] : ['confirmed', 'finalized'];
      
      for (const commitment of commitmentLevels) {
        try {
          const transaction = await connection.getTransaction(txid, { commitment });
          
          if (transaction) {
            if (transaction.meta && transaction.meta.err) {
              return { status: 'failed', commitment, error: 'Transaction failed on-chain' };
            }
            
            if (transaction.meta && transaction.meta.confirmationStatus) {
              return { 
                status: transaction.meta.confirmationStatus, 
                commitment,
                error: null 
              };
            }
            
            // Fallback status check
            return { status: 'processed', commitment, error: null };
          }
        } catch (error) {
          console.log(`[TRANSACTION_MONITOR] Failed to get transaction with ${commitment} commitment: ${error.message}`);
          if (commitment === 'finalized') {
            // If finalized fails, try confirmed
            continue;
          }
          throw error;
        }
      }
      
      // Transaction not found
      return { status: 'not_found', commitment: 'unknown', error: 'Transaction not found' };
      
    } catch (error) {
      console.log(`[TRANSACTION_MONITOR] Error getting transaction status: ${error.message}`);
      return { status: 'error', commitment: 'unknown', error: error.message };
    }
  }

  // Finish monitoring and record results
  finishMonitoring(monitoringId, finalStatus, details) {
    const monitoringData = this.monitoringTransactions.get(monitoringId);
    if (!monitoringData) return;
    
    monitoringData.status = 'completed';
    monitoringData.finalStatus = finalStatus;
    monitoringData.completionDetails = details;
    monitoringData.endTime = Date.now();
    
    // Move to history
    this.monitoringHistory.set(monitoringId, monitoringData);
    this.monitoringTransactions.delete(monitoringId);
    
    // Log completion
    console.log(`[TRANSACTION_MONITOR] Monitoring completed for ${monitoringData.txid}: ${finalStatus}`);
    
    // Emit completion event (if using event emitter)
    if (this.onMonitoringComplete) {
      this.onMonitoringComplete(monitoringData);
    }
  }

  // Get monitoring status
  getMonitoringStatus(monitoringId) {
    const monitoringData = this.monitoringTransactions.get(monitoringId);
    if (monitoringData) {
      return {
        id: monitoringId,
        txid: monitoringData.txid,
        status: monitoringData.status,
        attempts: monitoringData.attempts,
        elapsed: Date.now() - monitoringData.startTime,
        lastStatus: monitoringData.lastStatus,
        config: monitoringData.config
      };
    }
    
    // Check history
    const historyData = this.monitoringHistory.get(monitoringId);
    if (historyData) {
      return {
        id: monitoringId,
        txid: historyData.txid,
        status: 'completed',
        finalStatus: historyData.finalStatus,
        attempts: historyData.attempts,
        totalTime: historyData.endTime - historyData.startTime,
        completionDetails: historyData.completionDetails
      };
    }
    
    return null;
  }

  // Stop monitoring a transaction
  stopMonitoring(monitoringId) {
    const monitoringData = this.monitoringTransactions.get(monitoringId);
    if (monitoringData) {
      // Clear the monitoring interval if it exists
      if (monitoringData.monitoringInterval) {
        clearInterval(monitoringData.monitoringInterval);
        monitoringData.monitoringInterval = null;
      }
      
      monitoringData.status = 'stopped';
      monitoringData.endTime = Date.now();
      
      // Move to history
      this.monitoringHistory.set(monitoringId, monitoringData);
      this.monitoringTransactions.delete(monitoringId);
      
      console.log(`[TRANSACTION_MONITOR] Monitoring stopped for ${monitoringData.txid}`);
      return true;
    }
    
    return false;
  }

  // Get monitoring statistics
  getMonitoringStats() {
    const stats = {
      active: this.monitoringTransactions.size,
      completed: this.monitoringHistory.size,
      tiers: this.walletMonitoringTiers,
      config: this.monitoringConfig
    };
    
    // Calculate success rates
    const completed = Array.from(this.monitoringHistory.values());
    if (completed.length > 0) {
      stats.successRate = completed.filter(m => m.finalStatus === 'SUCCESS').length / completed.length;
      stats.averageAttempts = completed.reduce((sum, m) => sum + m.attempts, 0) / completed.length;
      stats.averageTime = completed.reduce((sum, m) => sum + (m.endTime - m.startTime), 0) / completed.length;
    }
    
    return stats;
  }

  // Clean up old monitoring data
  cleanupOldMonitoringData() {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, data] of this.monitoringHistory.entries()) {
      if (data.endTime < cutoff) {
        this.monitoringHistory.delete(id);
      }
    }
    
    console.log(`[TRANSACTION_MONITOR] Cleanup completed, removed old monitoring data`);
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldMonitoringData();
    }, 60 * 60 * 1000); // Every hour
  }

  // Reset all monitoring data
  reset() {
    this.monitoringTransactions.clear();
    this.monitoringHistory.clear();
    console.log('[TRANSACTION_MONITOR] All monitoring data reset');
  }
}

export default TransactionMonitor;
