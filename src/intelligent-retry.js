// Intelligent Retry Logic with Exponential Backoff for High-Value Wallets
class IntelligentRetryManager {
  constructor() {
    this.retryHistory = new Map();
    this.walletRetryConfigs = new Map();
    this.globalRetryStats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0
    };
    
    // Retry configuration based on wallet value
    this.retryTiers = {
      ULTRA_HIGH: { min: 1000000000, maxRetries: 8, baseDelay: 500, maxDelay: 10000 },    // >1 SOL
      VERY_HIGH: { min: 100000000, maxRetries: 6, baseDelay: 1000, maxDelay: 15000 },      // >0.1 SOL
      HIGH: { min: 10000000, maxRetries: 5, baseDelay: 1500, maxDelay: 20000 },             // >0.01 SOL
      MEDIUM: { min: 1000000, maxRetries: 4, baseDelay: 2000, maxDelay: 25000 },            // >0.001 SOL
      LOW: { min: 0, maxRetries: 3, baseDelay: 3000, maxDelay: 30000 }                      // Default
    };
    
    // Operation-specific retry configurations
    this.operationRetryConfigs = {
      'getConnection': { priority: 'high', maxRetries: 5 },
      'getBalance': { priority: 'medium', maxRetries: 4 },
      'createTransaction': { priority: 'high', maxRetries: 6 },
      'signTransaction': { priority: 'critical', maxRetries: 8 },
      'broadcastTransaction': { priority: 'high', maxRetries: 5 },
      'confirmTransaction': { priority: 'critical', maxRetries: 7 }
    };
  }

  // Get retry configuration for wallet balance
  getRetryConfig(balance, operation = 'default') {
    let tier = 'LOW';
    
    // Determine tier based on balance
    for (const [tierName, config] of Object.entries(this.retryTiers)) {
      if (balance >= config.min) {
        tier = tierName;
        break;
      }
    }
    
    const baseConfig = this.retryTiers[tier];
    const operationConfig = this.operationRetryConfigs[operation] || { priority: 'medium', maxRetries: baseConfig.maxRetries };
    
    // Adjust retries based on operation priority
    let maxRetries = baseConfig.maxRetries;
    if (operationConfig.priority === 'critical') {
      maxRetries = Math.min(10, maxRetries + 2);
    } else if (operationConfig.priority === 'high') {
      maxRetries = Math.min(8, maxRetries + 1);
    }
    
    return {
      tier: tier,
      maxRetries: maxRetries,
      baseDelay: baseConfig.baseDelay,
      maxDelay: baseConfig.maxDelay,
      operation: operation,
      priority: operationConfig.priority
    };
  }

  // Execute function with intelligent retry logic
  async executeWithRetry(operation, func, walletBalance = 0, context = {}) {
    const retryConfig = this.getRetryConfig(walletBalance, operation);
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[INTELLIGENT_RETRY] Starting ${operation} for ${retryConfig.tier} tier wallet (${(walletBalance / 1e9).toFixed(6)} SOL)`);
    console.log(`[INTELLIGENT_RETRY] Max retries: ${retryConfig.maxRetries}, Base delay: ${retryConfig.baseDelay}ms`);
    
    let lastError = null;
    let totalDelay = 0;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[INTELLIGENT_RETRY] ${operation} attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
        }
        
        const result = await func();
        
        // Success - log and return
        if (attempt > 0) {
          console.log(`[INTELLIGENT_RETRY] ${operation} succeeded on attempt ${attempt + 1}`);
          this.recordSuccessfulRetry(operation, walletBalance, attempt, totalDelay);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        if (attempt === retryConfig.maxRetries) {
          // Final attempt failed
          console.log(`[INTELLIGENT_RETRY] ${operation} failed after ${retryConfig.maxRetries + 1} attempts`);
          this.recordFailedRetry(operation, walletBalance, retryConfig.maxRetries, totalDelay, error);
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt, retryConfig, error);
        totalDelay += delay;
        
        console.log(`[INTELLIGENT_RETRY] ${operation} attempt ${attempt + 1} failed: ${error.message}`);
        console.log(`[INTELLIGENT_RETRY] Waiting ${delay}ms before retry...`);
        
        // Wait before retry
        await this.delay(delay);
      }
    }
  }

  // Calculate retry delay with exponential backoff
  calculateRetryDelay(attempt, retryConfig, error) {
    let baseDelay = retryConfig.baseDelay;
    
    // Exponential backoff: delay = baseDelay * 2^attempt
    let delay = baseDelay * Math.pow(2, attempt);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;
    
    // Cap delay at maximum
    delay = Math.min(delay, retryConfig.maxDelay);
    
    // Adjust delay based on error type
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      delay = Math.max(delay, 5000); // Minimum 5s for rate limits
    }
    
    if (error.message?.includes('timeout') || error.message?.includes('connection')) {
      delay = Math.max(delay, 3000); // Minimum 3s for timeouts
    }
    
    return Math.ceil(delay);
  }

  // Delay utility function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Record successful retry
  recordSuccessfulRetry(operation, walletBalance, attempts, totalDelay) {
    const key = `${operation}_success`;
    const history = this.retryHistory.get(key) || [];
    
    history.push({
      timestamp: Date.now(),
      walletBalance,
      attempts,
      totalDelay,
      success: true
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.retryHistory.set(key, history);
    this.updateGlobalStats(attempts, totalDelay, true);
  }

  // Record failed retry
  recordFailedRetry(operation, walletBalance, attempts, totalDelay, error) {
    const key = `${operation}_failed`;
    const history = this.retryHistory.get(key) || [];
    
    history.push({
      timestamp: Date.now(),
      walletBalance,
      attempts,
      totalDelay,
      success: false,
      error: error.message
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.retryHistory.set(key, history);
    this.updateGlobalStats(attempts, totalDelay, false);
  }

  // Update global retry statistics
  updateGlobalStats(attempts, totalDelay, success) {
    this.globalRetryStats.totalRetries++;
    
    if (success) {
      this.globalRetryStats.successfulRetries++;
    } else {
      this.globalRetryStats.failedRetries++;
    }
    
    // Update average delay
    const currentAvg = this.globalRetryStats.averageRetryDelay;
    const newAvg = (currentAvg * (this.globalRetryStats.totalRetries - 1) + totalDelay) / this.globalRetryStats.totalRetries;
    this.globalRetryStats.averageRetryDelay = newAvg;
  }

  // Get retry statistics
  getRetryStats() {
    const stats = {
      global: this.globalRetryStats,
      tiers: this.retryTiers,
      operations: this.operationRetryConfigs,
      history: {}
    };
    
    // Process history data
    for (const [key, history] of this.retryHistory.entries()) {
      if (history.length > 0) {
        const recent = history.slice(-10); // Last 10 entries
        
        stats.history[key] = {
          total: history.length,
          recent: recent.length,
          successRate: history.filter(h => h.success).length / history.length,
          averageAttempts: history.reduce((sum, h) => sum + h.attempts, 0) / history.length,
          averageDelay: history.reduce((sum, h) => sum + h.totalDelay, 0) / history.length
        };
      }
    }
    
    return stats;
  }

  // Reset retry statistics
  resetStats() {
    this.retryHistory.clear();
    this.globalRetryStats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0
    };
    console.log('[INTELLIGENT_RETRY] Statistics reset');
  }

  // Get wallet-specific retry recommendations
  getWalletRetryRecommendations(balance) {
    const config = this.getRetryConfig(balance);
    
    return {
      tier: config.tier,
      balance: (balance / 1e9).toFixed(6) + ' SOL',
      maxRetries: config.maxRetries,
      baseDelay: config.baseDelay + 'ms',
      maxDelay: config.maxDelay + 'ms',
      recommendation: this.getRecommendation(config.tier)
    };
  }

  // Get recommendation based on tier
  getRecommendation(tier) {
    const recommendations = {
      'ULTRA_HIGH': 'Maximum retry attempts with fastest delays for critical operations',
      'VERY_HIGH': 'High retry attempts with fast delays for important operations',
      'HIGH': 'Moderate retry attempts with balanced delays',
      'MEDIUM': 'Standard retry attempts with normal delays',
      'LOW': 'Basic retry attempts with conservative delays'
    };
    
    return recommendations[tier] || recommendations['LOW'];
  }
}

export default IntelligentRetryManager;
