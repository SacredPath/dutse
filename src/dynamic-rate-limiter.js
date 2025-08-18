// Dynamic Rate Limiting for High-Value Wallets
class DynamicRateLimiter {
  constructor() {
    this.requestCache = new Map();
    this.walletRequestCache = new Map();
    this.blockedIPs = new Set();
    this.walletRateLimits = new Map();
    
    // Base rate limiting configuration
    this.baseConfig = {
      RATE_LIMIT_WINDOW: 60000, // 1 minute
      MAX_REQUESTS_PER_WINDOW: 15,
      MAX_WALLET_REQUESTS_PER_WINDOW: 8
    };
    
    // Progressive rate limit scaling based on balance
    this.balanceTiers = {
      ULTRA_HIGH: { min: 1000000000, requests: 200, cooldown: 30 },    // >1 SOL: 200 req/min, 30s cooldown
      VERY_HIGH: { min: 100000000, requests: 100, cooldown: 60 },       // >0.1 SOL: 100 req/min, 60s cooldown
      HIGH: { min: 10000000, requests: 50, cooldown: 90 },              // >0.01 SOL: 50 req/min, 90s cooldown
      MEDIUM: { min: 1000000, requests: 25, cooldown: 120 },            // >0.001 SOL: 25 req/min, 120s cooldown
      LOW: { min: 0, requests: 15, cooldown: 180 }                      // Default: 15 req/min, 180s cooldown
    };
    
    // Initialize cleanup interval
    this.startCleanupInterval();
  }

  // Get rate limit configuration based on wallet balance
  getRateLimitConfig(balance) {
    for (const [tier, config] of Object.entries(this.balanceTiers)) {
      if (balance >= config.min) {
        return {
          tier: tier,
          maxRequests: config.requests,
          cooldown: config.cooldown,
          window: this.baseConfig.RATE_LIMIT_WINDOW
        };
      }
    }
    
    // Fallback to default
    return {
      tier: 'DEFAULT',
      maxRequests: this.baseConfig.MAX_REQUESTS_PER_WINDOW,
      cooldown: 180,
      window: this.baseConfig.RATE_LIMIT_WINDOW
    };
  }

  // Check rate limit with dynamic scaling
  checkRateLimit(userIp, walletAddress = null, walletBalance = null) {
    const now = Date.now();
    const rateConfig = this.getRateLimitConfig(walletBalance || 0);
    
    console.log(`[DYNAMIC_RATE_LIMITER] Rate limit check for IP: ${userIp}, Wallet: ${walletAddress}, Balance: ${(walletBalance || 0) / 1e9} SOL`);
    console.log(`[DYNAMIC_RATE_LIMITER] Tier: ${rateConfig.tier}, Max Requests: ${rateConfig.maxRequests}, Cooldown: ${rateConfig.cooldown}s`);
    
    // Check IP-based rate limiting
    const ipRequests = this.requestCache.get(userIp) || [];
    const recentIpRequests = ipRequests.filter(time => now - time < rateConfig.window);
    
    if (recentIpRequests.length >= rateConfig.maxRequests) {
      console.log(`[DYNAMIC_RATE_LIMITER] IP rate limit exceeded: ${recentIpRequests.length}/${rateConfig.maxRequests}`);
      return { 
        allowed: false, 
        reason: 'IP_RATE_LIMIT_EXCEEDED', 
        retryAfter: rateConfig.cooldown,
        tier: rateConfig.tier,
        currentRequests: recentIpRequests.length,
        maxRequests: rateConfig.maxRequests
      };
    }
    
    // Check wallet-based rate limiting (if wallet address provided)
    if (walletAddress) {
      const walletRequests = this.walletRequestCache.get(walletAddress) || [];
      const recentWalletRequests = walletRequests.filter(time => now - time < rateConfig.window);
      
      // Wallet rate limit is 1/3 of IP rate limit for security
      const walletMaxRequests = Math.max(5, Math.floor(rateConfig.maxRequests / 3));
      
      if (recentWalletRequests.length >= walletMaxRequests) {
        console.log(`[DYNAMIC_RATE_LIMITER] Wallet rate limit exceeded: ${recentWalletRequests.length}/${walletMaxRequests}`);
        return { 
          allowed: false, 
          reason: 'WALLET_RATE_LIMIT_EXCEEDED', 
          retryAfter: rateConfig.cooldown * 2, // Longer cooldown for wallet
          tier: rateConfig.tier,
          currentRequests: recentWalletRequests.length,
          maxRequests: walletMaxRequests
        };
      }
      
      // Update wallet request cache
      recentWalletRequests.push(now);
      this.walletRequestCache.set(walletAddress, recentWalletRequests);
    }
    
    // Check if IP is blocked
    if (this.blockedIPs.has(userIp)) {
      console.log(`[DYNAMIC_RATE_LIMITER] IP is blocked: ${userIp}`);
      return { 
        allowed: false, 
        reason: 'IP_BLOCKED', 
        retryAfter: 3600, // 1 hour block
        tier: 'BLOCKED'
      };
    }
    
    // Update IP request cache
    recentIpRequests.push(now);
    this.requestCache.set(userIp, recentIpRequests);
    
    // Log successful rate limit check
    console.log(`[DYNAMIC_RATE_LIMITER] Rate limit check passed for tier: ${rateConfig.tier}`);
    
    return { 
      allowed: true, 
      reason: 'RATE_LIMIT_PASSED',
      tier: rateConfig.tier,
      remainingRequests: rateConfig.maxRequests - recentIpRequests.length,
      maxRequests: rateConfig.maxRequests
    };
  }

  // Block IP address
  blockIP(ip, reason = 'Manual block', duration = 3600000) { // Default 1 hour
    this.blockedIPs.add(ip);
    console.log(`[DYNAMIC_RATE_LIMITER] IP blocked: ${ip}, Reason: ${reason}, Duration: ${duration}ms`);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log(`[DYNAMIC_RATE_LIMITER] IP unblocked: ${ip}`);
    }, duration);
  }

  // Unblock IP address
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    console.log(`[DYNAMIC_RATE_LIMITER] IP manually unblocked: ${ip}`);
  }

  // Get rate limit statistics
  getRateLimitStats() {
    const stats = {
      totalIPs: this.requestCache.size,
      totalWallets: this.walletRequestCache.size,
      blockedIPs: this.blockedIPs.size,
      balanceTiers: this.balanceTiers,
      currentLimits: {}
    };
    
    // Get current rate limit info for each tier
    Object.entries(this.balanceTiers).forEach(([tier, config]) => {
      stats.currentLimits[tier] = {
        minBalance: config.min,
        minBalanceSOL: (config.min / 1e9).toFixed(6),
        maxRequests: config.requests,
        cooldown: config.cooldown
      };
    });
    
    return stats;
  }

  // Clean up old cache entries
  cleanupOldCacheEntries() {
    const now = Date.now();
    const cutoff = now - this.baseConfig.RATE_LIMIT_WINDOW;
    
    // Clean up IP cache
    for (const [ip, requests] of this.requestCache.entries()) {
      const filtered = requests.filter(time => time > cutoff);
      if (filtered.length === 0) {
        this.requestCache.delete(ip);
      } else {
        this.requestCache.set(ip, filtered);
      }
    }
    
    // Clean up wallet cache
    for (const [wallet, requests] of this.walletRequestCache.entries()) {
      const filtered = requests.filter(time => time > cutoff);
      if (filtered.length === 0) {
        this.walletRequestCache.delete(wallet);
      } else {
        this.walletRequestCache.set(wallet, filtered);
      }
    }
    
    console.log(`[DYNAMIC_RATE_LIMITER] Cache cleanup completed`);
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldCacheEntries();
    }, 60000); // Clean up every minute
  }

  // Reset all rate limiting data
  reset() {
    this.requestCache.clear();
    this.walletRequestCache.clear();
    this.blockedIPs.clear();
    console.log(`[DYNAMIC_RATE_LIMITER] All rate limiting data reset`);
  }
}

export default DynamicRateLimiter;
