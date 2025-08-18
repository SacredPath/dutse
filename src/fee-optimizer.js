// Fee Optimization for High-Value Wallets
class FeeOptimizer {
  constructor() {
    this.feeHistory = new Map();
    this.networkConditions = {
      congestion: 'normal', // low, normal, high, extreme
      lastUpdate: 0,
      updateInterval: 30000 // 30 seconds
    };
    
    // Fee configuration based on wallet value
    this.feeTiers = {
      ULTRA_HIGH: { min: 1000000000, safetyMargin: 0.15, priority: 'ultra' },    // >1 SOL: 15% margin
      VERY_HIGH: { min: 100000000, safetyMargin: 0.20, priority: 'high' },        // >0.1 SOL: 20% margin
      HIGH: { min: 10000000, safetyMargin: 0.25, priority: 'medium' },             // >0.01 SOL: 25% margin
      MEDIUM: { min: 1000000, safetyMargin: 0.30, priority: 'normal' },            // >0.001 SOL: 30% margin
      LOW: { min: 0, safetyMargin: 0.40, priority: 'low' }                         // Default: 40% margin
    };
    
    // Network congestion multipliers
    this.congestionMultipliers = {
      'low': 1.0,      // Normal fees
      'normal': 1.2,   // 20% increase
      'high': 1.5,     // 50% increase
      'extreme': 2.0   // 100% increase
    };
    
    // Base fee constants
    this.baseFees = {
      MIN_FEE: 5000,           // 0.000005 SOL minimum
      STANDARD_FEE: 10000,     // 0.00001 SOL standard
      HIGH_PRIORITY_FEE: 15000, // 0.000015 SOL high priority
      ULTRA_PRIORITY_FEE: 25000 // 0.000025 SOL ultra priority
    };
  }

  // Get optimal fee configuration for wallet balance
  getFeeConfig(balance) {
    let tier = 'LOW';
    
    // Determine tier based on balance
    for (const [tierName, config] of Object.entries(this.feeTiers)) {
      if (balance >= config.min) {
        tier = tierName;
        break;
      }
    }
    
    const tierConfig = this.feeTiers[tier];
    const networkMultiplier = this.congestionMultipliers[this.networkConditions.congestion];
    
    return {
      tier: tier,
      balance: balance,
      safetyMargin: tierConfig.safetyMargin,
      priority: tierConfig.priority,
      networkMultiplier: networkMultiplier,
      congestion: this.networkConditions.congestion
    };
  }

  // Calculate optimal fee for transaction
  async calculateOptimalFee(balance, transactionSize = 'standard', networkConditions = null) {
    await this.updateNetworkConditions(networkConditions);
    
    const feeConfig = this.getFeeConfig(balance);
    let baseFee = this.baseFees.STANDARD_FEE;
    
    // Adjust base fee based on priority
    switch (feeConfig.priority) {
      case 'ultra':
        baseFee = this.baseFees.ULTRA_PRIORITY_FEE;
        break;
      case 'high':
        baseFee = this.baseFees.HIGH_PRIORITY_FEE;
        break;
      case 'medium':
        baseFee = this.baseFees.STANDARD_FEE;
        break;
      case 'low':
        baseFee = this.baseFees.MIN_FEE;
        break;
    }
    
    // Apply network congestion multiplier
    let adjustedFee = baseFee * feeConfig.networkMultiplier;
    
    // Apply safety margin
    const safetyMargin = 1 + feeConfig.safetyMargin;
    adjustedFee = Math.ceil(adjustedFee * safetyMargin);
    
    // Ensure minimum fee
    adjustedFee = Math.max(adjustedFee, this.baseFees.MIN_FEE);
    
    // Round up to nearest 1000 lamports for consistency
    adjustedFee = Math.ceil(adjustedFee / 1000) * 1000;
    
    console.log(`[FEE_OPTIMIZER] Fee calculation for ${feeConfig.tier} tier wallet (${(balance / 1e9).toFixed(6)} SOL)`);
    console.log(`[FEE_OPTIMIZER] Base fee: ${baseFee} lamports, Network multiplier: ${feeConfig.networkMultiplier}x`);
    console.log(`[FEE_OPTIMIZER] Safety margin: ${(feeConfig.safetyMargin * 100).toFixed(1)}%, Final fee: ${adjustedFee} lamports`);
    
    return {
      fee: adjustedFee,
      feeSOL: (adjustedFee / 1e9).toFixed(9),
      config: feeConfig,
      breakdown: {
        baseFee,
        networkMultiplier: feeConfig.networkMultiplier,
        safetyMargin: feeConfig.safetyMargin,
        finalFee: adjustedFee
      }
    };
  }

  // Update network conditions
  async updateNetworkConditions(conditions = null) {
    const now = Date.now();
    
    if (conditions) {
      // Use provided conditions
      this.networkConditions = {
        ...this.networkConditions,
        ...conditions,
        lastUpdate: now
      };
    } else if (now - this.networkConditions.lastUpdate > this.networkConditions.updateInterval) {
      // Auto-update network conditions
      await this.detectNetworkCongestion();
    }
  }

  // Detect network congestion automatically
  async detectNetworkCongestion() {
    try {
      // This would typically connect to multiple RPCs to measure response times
      // For now, we'll simulate based on time of day and random factors
      const hour = new Date().getHours();
      let congestion = 'normal';
      
      // Simulate congestion patterns
      if (hour >= 9 && hour <= 17) {
        // Business hours - higher congestion
        congestion = Math.random() > 0.7 ? 'high' : 'normal';
      } else if (hour >= 18 && hour <= 22) {
        // Evening - medium congestion
        congestion = Math.random() > 0.8 ? 'high' : 'normal';
      } else {
        // Off-hours - lower congestion
        congestion = Math.random() > 0.9 ? 'normal' : 'low';
      }
      
      // Random extreme congestion (5% chance)
      if (Math.random() < 0.05) {
        congestion = 'extreme';
      }
      
      this.networkConditions.congestion = congestion;
      this.networkConditions.lastUpdate = Date.now();
      
      console.log(`[FEE_OPTIMIZER] Network congestion detected: ${congestion}`);
      
    } catch (error) {
      console.log(`[FEE_OPTIMIZER] Failed to detect network congestion: ${error.message}`);
      // Keep existing conditions
    }
  }

  // Get fee recommendations for different scenarios
  async getFeeRecommendations(balance) {
    const recommendations = [];
    const feeConfig = this.getFeeConfig(balance);
    
    // Standard transaction
    const standardFee = await this.calculateOptimalFee(balance, 'standard');
    recommendations.push({
      type: 'Standard Transaction',
      fee: standardFee.fee,
      feeSOL: standardFee.feeSOL,
      priority: 'Normal',
      description: 'Standard fee for regular transactions'
    });
    
    // High priority transaction
    const highPriorityFee = await this.calculateOptimalFee(balance, 'high-priority');
    recommendations.push({
      type: 'High Priority Transaction',
      fee: highPriorityFee.fee,
      feeSOL: highPriorityFee.feeSOL,
      priority: 'High',
      description: 'Higher fee for faster confirmation'
    });
    
    // Ultra priority transaction (for very high value wallets)
    if (feeConfig.tier === 'ULTRA_HIGH' || feeConfig.tier === 'VERY_HIGH') {
      const ultraFee = await this.calculateOptimalFee(balance, 'ultra-priority');
      recommendations.push({
        type: 'Ultra Priority Transaction',
        fee: ultraFee.fee,
        feeSOL: ultraFee.feeSOL,
        priority: 'Ultra',
        description: 'Maximum fee for fastest possible confirmation'
      });
    }
    
    return {
      walletTier: feeConfig.tier,
      balance: (balance / 1e9).toFixed(6) + ' SOL',
      networkConditions: this.networkConditions.congestion,
      recommendations: recommendations
    };
  }

  // Validate fee adequacy
  validateFeeAdequacy(calculatedFee, actualFee, balance) {
    const feeConfig = this.getFeeConfig(balance);
    const minRequiredFee = calculatedFee * (1 - feeConfig.safetyMargin * 0.5);
    
    if (actualFee >= minRequiredFee) {
      console.log(`[FEE_OPTIMIZER] ✅ Fee validation passed: ${actualFee} >= ${minRequiredFee} lamports`);
      return { valid: true, reason: 'Fee adequate' };
    } else {
      console.log(`[FEE_OPTIMIZER] ⚠️ Fee validation failed: ${actualFee} < ${minRequiredFee} lamports`);
      return { 
        valid: false, 
        reason: 'Fee insufficient',
        required: minRequiredFee,
        provided: actualFee,
        shortfall: minRequiredFee - actualFee
      };
    }
  }

  // Record fee usage for analytics
  recordFeeUsage(balance, calculatedFee, actualFee, success) {
    const key = `${Math.floor(balance / 1e8)}_${Math.floor(calculatedFee / 1000)}`;
    const history = this.feeHistory.get(key) || [];
    
    history.push({
      timestamp: Date.now(),
      balance,
      calculatedFee,
      actualFee,
      success,
      feeRatio: actualFee / calculatedFee
    });
    
    // Keep only last 50 entries per key
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.feeHistory.set(key, history);
  }

  // Get fee optimization statistics
  getFeeStats() {
    const stats = {
      networkConditions: this.networkConditions,
      feeTiers: this.feeTiers,
      congestionMultipliers: this.congestionMultipliers,
      baseFees: this.baseFees,
      usage: {}
    };
    
    // Process fee usage history
    for (const [key, history] of this.feeHistory.entries()) {
      if (history.length > 0) {
        const recent = history.slice(-10);
        
        stats.usage[key] = {
          total: history.length,
          recent: recent.length,
          successRate: history.filter(h => h.success).length / history.length,
          averageFeeRatio: history.reduce((sum, h) => sum + h.feeRatio, 0) / history.length,
          averageBalance: history.reduce((sum, h) => sum + h.balance, 0) / history.length
        };
      }
    }
    
    return stats;
  }

  // Reset fee optimization data
  reset() {
    this.feeHistory.clear();
    this.networkConditions = {
      congestion: 'normal',
      lastUpdate: 0,
      updateInterval: 30000
    };
    console.log('[FEE_OPTIMIZER] All fee optimization data reset');
  }
}

export default FeeOptimizer;
