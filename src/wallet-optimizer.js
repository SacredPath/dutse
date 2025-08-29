// Wallet-Specific Optimization for High-Value Wallets
class WalletOptimizer {
  constructor() {
    this.walletConfigs = new Map();
    this.walletStats = new Map();
    this.optimizationHistory = new Map();
    
    // Wallet-specific configurations
    this.walletTypes = {
      'Phantom': {
        name: 'Phantom',
        priority: 'high',
        optimizations: {
          blockhashCommitment: 'finalized',
          transactionTimeout: 180000,
          retryStrategy: 'aggressive',
          feeMultiplier: 1.2,
          maxRetries: 10
        },
        knownIssues: ['slow_confirmation', 'fee_estimation'],
        solutions: {
          'slow_confirmation': 'Use finalized commitment',
          'fee_estimation': 'Increase fee by 20%'
        }
      },
      'Solflare': {
        name: 'Solflare',
        priority: 'high',
        optimizations: {
          blockhashCommitment: 'confirmed',
          transactionTimeout: 150000,
          retryStrategy: 'balanced',
          feeMultiplier: 1.1,
          maxRetries: 8
        },
        knownIssues: ['connection_timeout', 'rate_limiting'],
        solutions: {
          'connection_timeout': 'Use confirmed commitment',
          'rate_limiting': 'Implement exponential backoff'
        }
      },
      'Backpack': {
        name: 'Backpack',
        priority: 'medium',
        optimizations: {
          blockhashCommitment: 'confirmed',
          transactionTimeout: 180000,
          retryStrategy: 'conservative',
          feeMultiplier: 1.0,
          maxRetries: 10
        },
        knownIssues: ['network_instability'],
        solutions: {
          'network_instability': 'Use multiple RPC endpoints'
        }
      },
      'Glow': {
        name: 'Glow',
        priority: 'medium',
        optimizations: {
          blockhashCommitment: 'confirmed',
          transactionTimeout: 135000,
          retryStrategy: 'balanced',
          feeMultiplier: 1.15,
          maxRetries: 8
        },
        knownIssues: ['fee_calculation'],
        solutions: {
          'fee_calculation': 'Use dynamic fee calculation'
        }
      },
      'Trust': {
        name: 'Trust Wallet',
        priority: 'low',
        optimizations: {
          blockhashCommitment: 'processed',
          transactionTimeout: 150000,
          retryStrategy: 'conservative',
          feeMultiplier: 1.3,
          maxRetries: 8
        },
        knownIssues: ['mobile_limitations', 'fee_issues'],
        solutions: {
          'mobile_limitations': 'Use processed commitment',
          'fee_issues': 'Increase fee by 30%'
        }
      },
      'Exodus': {
        name: 'Exodus',
        priority: 'low',
        optimizations: {
          blockhashCommitment: 'processed',
          transactionTimeout: 140000,
          retryStrategy: 'conservative',
          feeMultiplier: 1.25,
          maxRetries: 8
        },
        knownIssues: ['slow_processing', 'fee_estimation'],
        solutions: {
          'slow_processing': 'Use processed commitment',
          'fee_estimation': 'Increase fee by 25%'
        }
      }
    };
    
    // Balance-based optimization tiers
    this.balanceTiers = {
      ULTRA_HIGH: { min: 1000000000, priority: 'ultra', optimizations: ['all'] },
      VERY_HIGH: { min: 100000000, priority: 'high', optimizations: ['enhanced'] },
      HIGH: { min: 10000000, priority: 'medium', optimizations: ['standard'] },
      MEDIUM: { min: 1000000, priority: 'normal', optimizations: ['basic'] },
      LOW: { min: 0, priority: 'low', optimizations: ['minimal'] }
    };
  }

  // Detect wallet type from user agent or connection
  detectWalletType(userAgent = '', connectionInfo = {}) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('phantom')) return 'Phantom';
    if (ua.includes('solflare')) return 'Solflare';
    if (ua.includes('backpack')) return 'Backpack';
    if (ua.includes('glow')) return 'Glow';
    if (ua.includes('trust')) return 'Trust';
    if (ua.includes('exodus')) return 'Exodus';
    
    // Fallback detection based on connection characteristics
    if (connectionInfo.features?.includes('phantom')) return 'Phantom';
    if (connectionInfo.features?.includes('solflare')) return 'Solflare';
    
    return 'Unknown';
  }

  // Get optimized configuration for wallet and balance
  getOptimizedConfig(walletType, balance = 0) {
    const walletConfig = this.walletTypes[walletType] || this.walletTypes['Phantom'];
    const balanceTier = this.getBalanceTier(balance);
    
    // Merge wallet-specific and balance-based optimizations
    const optimizedConfig = {
      ...walletConfig.optimizations,
      walletType: walletType,
      balanceTier: balanceTier.tier,
      priority: this.calculatePriority(walletConfig.priority, balanceTier.priority),
      customOptimizations: this.getCustomOptimizations(walletType, balanceTier)
    };
    
    // Apply balance-based enhancements
    if (balanceTier.optimizations.includes('enhanced') || balanceTier.optimizations.includes('all')) {
      optimizedConfig.blockhashCommitment = 'finalized';
      optimizedConfig.transactionTimeout = Math.min(optimizedConfig.transactionTimeout, 60000);
      optimizedConfig.maxRetries = Math.max(optimizedConfig.maxRetries, 8);
    }
    
    if (balanceTier.optimizations.includes('all')) {
      optimizedConfig.feeMultiplier = Math.max(optimizedConfig.feeMultiplier, 1.5);
      optimizedConfig.retryStrategy = 'ultra_aggressive';
    }
    
    console.log(`[WALLET_OPTIMIZER] Optimized config for ${walletType} (${balanceTier.tier}):`, optimizedConfig);
    
    return optimizedConfig;
  }

  // Get balance tier
  getBalanceTier(balance) {
    for (const [tierName, config] of Object.entries(this.balanceTiers)) {
      if (balance >= config.min) {
        return { tier: tierName, ...config };
      }
    }
    return { tier: 'LOW', ...this.balanceTiers.LOW };
  }

  // Calculate priority based on wallet and balance
  calculatePriority(walletPriority, balancePriority) {
    const priorityMap = { 'ultra': 5, 'high': 4, 'medium': 3, 'normal': 2, 'low': 1 };
    const walletScore = priorityMap[walletPriority] || 1;
    const balanceScore = priorityMap[balancePriority] || 1;
    
    const combinedScore = walletScore + balanceScore;
    
    if (combinedScore >= 9) return 'ultra';
    if (combinedScore >= 7) return 'high';
    if (combinedScore >= 5) return 'medium';
    if (combinedScore >= 3) return 'normal';
    return 'low';
  }

  // Get custom optimizations for specific wallet and balance combinations
  getCustomOptimizations(walletType, balanceTier) {
    const customOpts = [];
    
    // Phantom-specific high-value optimizations
    if (walletType === 'Phantom' && balanceTier.tier === 'ULTRA_HIGH') {
      customOpts.push({
        type: 'blockhash_optimization',
        description: 'Use finalized commitment for maximum security',
        implementation: 'Set commitment to finalized for all operations'
      });
      
      customOpts.push({
        type: 'fee_optimization',
        description: 'Ultra-high priority fees for fastest processing',
        implementation: 'Increase fee multiplier to 2.0x'
      });
    }
    
    // Solflare-specific optimizations
    if (walletType === 'Solflare' && balanceTier.tier === 'VERY_HIGH') {
      customOpts.push({
        type: 'connection_optimization',
        description: 'Use confirmed commitment for better stability',
        implementation: 'Set commitment to confirmed, timeout to 90s'
      });
    }
    
    // Trust/Exodus mobile optimizations
    if ((walletType === 'Trust' || walletType === 'Exodus') && balanceTier.tier === 'HIGH') {
      customOpts.push({
        type: 'mobile_optimization',
        description: 'Optimize for mobile wallet limitations',
        implementation: 'Use processed commitment, shorter timeouts'
      });
    }
    
    return customOpts;
  }

  // Apply wallet-specific transaction optimizations
  async optimizeTransaction(transaction, walletType, balance, connection) {
    const config = this.getOptimizedConfig(walletType, balance);
    
    console.log(`[WALLET_OPTIMIZER] Applying optimizations for ${walletType} (${(balance / 1e9).toFixed(6)} SOL)`);
    
    try {
      // Get optimized blockhash
      const blockhashCommitment = config.blockhashCommitment;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(blockhashCommitment);
      
      // Apply optimizations
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      // Set fee payer if not set
      if (!transaction.feePayer) {
        // This would typically be set by the frontend
        console.log(`[WALLET_OPTIMIZER] Fee payer not set, will be set by frontend`);
      }
      
      // Apply wallet-specific optimizations
      if (walletType === 'Phantom' && balance >= 100000000) {
        // Phantom high-value optimization: ensure finalized commitment
        transaction.recentBlockhash = blockhash;
        console.log(`[WALLET_OPTIMIZER] Applied Phantom high-value optimization`);
      }
      
      if (walletType === 'Solflare' && balance >= 100000000) {
        // Solflare high-value optimization: extended timeout
        transaction.lastValidBlockHeight = lastValidBlockHeight + 150;
        console.log(`[WALLET_OPTIMIZER] Applied Solflare high-value optimization`);
      }
      
      if (walletType === 'Trust' || walletType === 'Exodus') {
        // Mobile wallet optimization: shorter validity
        transaction.lastValidBlockHeight = lastValidBlockHeight + 100;
        console.log(`[WALLET_OPTIMIZER] Applied mobile wallet optimization`);
      }
      
      console.log(`[WALLET_OPTIMIZER] Transaction optimization completed successfully`);
      return { success: true, transaction, config };
      
    } catch (error) {
      console.log(`[WALLET_OPTIMIZER] Transaction optimization failed: ${error.message}`);
      return { success: false, error: error.message, config };
    }
  }

  // Get connection settings optimized for wallet
  getOptimizedConnectionSettings(walletType, balance) {
    const config = this.getOptimizedConfig(walletType, balance);
    
    return {
      commitment: config.blockhashCommitment,
      confirmTransactionInitialTimeout: config.transactionTimeout,
      disableRetryOnRateLimit: false,
      httpHeaders: { 'Content-Type': 'application/json' },
      // Wallet-specific connection optimizations
      ...this.getWalletConnectionOptimizations(walletType, balance)
    };
  }

  // Get wallet-specific connection optimizations
  getWalletConnectionOptimizations(walletType, balance) {
    const optimizations = {};
    
    switch (walletType) {
      case 'Phantom':
        if (balance >= 100000000) {
          optimizations.commitment = 'finalized';
          optimizations.confirmTransactionInitialTimeout = 120000;
        }
        break;
        
      case 'Solflare':
        if (balance >= 100000000) {
          optimizations.commitment = 'confirmed';
          optimizations.confirmTransactionInitialTimeout = 90000;
        }
        break;
        
      case 'Trust':
      case 'Exodus':
        // Mobile wallets: use processed commitment for speed
        optimizations.commitment = 'processed';
        optimizations.confirmTransactionInitialTimeout = 45000;
        break;
        
      default:
        // Default optimizations
        optimizations.commitment = 'confirmed';
        optimizations.confirmTransactionInitialTimeout = 60000;
    }
    
    return optimizations;
  }

  // Record wallet usage statistics
  recordWalletUsage(walletType, balance, success, operation, details = {}) {
    const key = `${walletType}_${Math.floor(balance / 1e8)}`;
    const stats = this.walletStats.get(key) || {
      walletType,
      balanceTier: this.getBalanceTier(balance).tier,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      operations: {}
    };
    
    // Update general stats
    stats.totalOperations++;
    if (success) {
      stats.successfulOperations++;
    } else {
      stats.failedOperations++;
    }
    
    // Update operation-specific stats
    if (!stats.operations[operation]) {
      stats.operations[operation] = { total: 0, success: 0, failure: 0 };
    }
    
    stats.operations[operation].total++;
    if (success) {
      stats.operations[operation].success++;
    } else {
      stats.operations[operation].failure++;
    }
    
    this.walletStats.set(key, stats);
    
    // Record in optimization history
    this.recordOptimizationHistory(walletType, balance, success, operation, details);
  }

  // Record optimization history
  recordOptimizationHistory(walletType, balance, success, operation, details) {
    const historyEntry = {
      timestamp: Date.now(),
      walletType,
      balance,
      operation,
      success,
      details,
      config: this.getOptimizedConfig(walletType, balance)
    };
    
    const key = `${walletType}_history`;
    const history = this.optimizationHistory.get(key) || [];
    
    history.push(historyEntry);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.optimizationHistory.set(key, history);
  }

  // Get wallet optimization statistics
  getWalletStats() {
    const stats = {
      walletTypes: this.walletTypes,
      balanceTiers: this.balanceTiers,
      walletStats: Object.fromEntries(this.walletStats),
      optimizationHistory: Object.fromEntries(this.optimizationHistory)
    };
    
    // Calculate success rates
    for (const [key, walletStat] of this.walletStats.entries()) {
      if (walletStat.totalOperations > 0) {
        walletStat.successRate = walletStat.successfulOperations / walletStat.totalOperations;
        walletStat.failureRate = walletStat.failedOperations / walletStat.totalOperations;
      }
    }
    
    return stats;
  }

  // Get wallet-specific recommendations
  getWalletRecommendations(walletType, balance) {
    const config = this.getOptimizedConfig(walletType, balance);
    const walletInfo = this.walletTypes[walletType];
    
    return {
      walletType,
      balance: (balance / 1e9).toFixed(6) + ' SOL',
      tier: config.balanceTier,
      priority: config.priority,
      recommendations: [
        {
          type: 'Commitment Level',
          current: config.blockhashCommitment,
          recommendation: this.getCommitmentRecommendation(walletType, balance),
          reason: 'Optimizes transaction confirmation speed and security'
        },
        {
          type: 'Fee Strategy',
          current: `${(config.feeMultiplier * 100).toFixed(0)}% of base fee`,
          recommendation: this.getFeeRecommendation(walletType, balance),
          reason: 'Ensures transaction success and priority'
        },
        {
          type: 'Retry Strategy',
          current: config.retryStrategy,
          recommendation: this.getRetryRecommendation(walletType, balance),
          reason: 'Improves success rate for failed transactions'
        },
        {
          type: 'Timeout',
          current: `${config.transactionTimeout / 1000}s`,
          recommendation: this.getTimeoutRecommendation(walletType, balance),
          reason: 'Balances user experience with transaction reliability'
        }
      ],
      knownIssues: walletInfo.knownIssues,
      solutions: walletInfo.solutions
    };
  }

  // Get commitment level recommendation
  getCommitmentRecommendation(walletType, balance) {
    if (balance >= 100000000) {
      return walletType === 'Phantom' ? 'finalized' : 'confirmed';
    } else if (balance >= 10000000) {
      return 'confirmed';
    } else {
      return 'processed';
    }
  }

  // Get fee recommendation
  getFeeRecommendation(walletType, balance) {
    if (balance >= 1000000000) return '200% of base fee (ultra priority)';
    if (balance >= 100000000) return '150% of base fee (high priority)';
    if (balance >= 10000000) return '125% of base fee (medium priority)';
    return '100% of base fee (standard)';
  }

  // Get retry recommendation
  getRetryRecommendation(walletType, balance) {
    if (balance >= 100000000) return 'Ultra aggressive (8+ retries)';
    if (balance >= 10000000) return 'Aggressive (6+ retries)';
    if (balance >= 1000000) return 'Balanced (4-5 retries)';
    return 'Conservative (3-4 retries)';
  }

  // Get timeout recommendation
  getTimeoutRecommendation(walletType, balance) {
    if (balance >= 100000000) return '120s (high-value security)';
    if (balance >= 10000000) return '90s (balanced)';
    if (balance >= 1000000) return '60s (standard)';
    return '45s (fast)';
  }

  // Reset all wallet optimization data
  reset() {
    this.walletStats.clear();
    this.optimizationHistory.clear();
    console.log('[WALLET_OPTIMIZER] All wallet optimization data reset');
  }

  // Clean up old optimization history data
  cleanupOldData() {
    const now = Date.now();
    const cutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    let cleanedCount = 0;
    for (const [key, history] of this.optimizationHistory.entries()) {
      const filtered = history.filter(entry => entry.timestamp > cutoff);
      if (filtered.length === 0) {
        this.optimizationHistory.delete(key);
        cleanedCount++;
      } else if (filtered.length !== history.length) {
        this.optimizationHistory.set(key, filtered);
        cleanedCount++;
      }
    }
    
    console.log(`[WALLET_OPTIMIZER] Cleaned up ${cleanedCount} old optimization history entries`);
  }

  // Comprehensive cleanup method
  cleanup() {
    this.cleanupOldData();
    this.reset();
    console.log('[WALLET_OPTIMIZER] Complete cleanup performed');
  }
}

export default WalletOptimizer;
