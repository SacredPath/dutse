import { Connection } from '@solana/web3.js';

// Enhanced RPC endpoints with weighted priority
const ENHANCED_RPC_ENDPOINTS = [
  { 
    url: 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b', 
    weight: 3, 
    priority: 'high',
    name: 'Helius'
  },
  { 
    url: 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0', 
    weight: 2, 
    priority: 'medium',
    name: 'Shyft'
  },
  { 
    url: 'https://api.mainnet-beta.solana.com', 
    weight: 1, 
    priority: 'low',
    name: 'Public'
  },
  { 
    url: 'https://solana-mainnet.g.alchemy.com/v2/demo', 
    weight: 1, 
    priority: 'low',
    name: 'Alchemy'
  }
];

class EnhancedRPCManager {
  constructor() {
    this.connectionPool = new Map();
    this.rpcHealth = new Map();
    this.currentRpcIndex = 0;
    this.failureCounts = new Map();
    this.successCounts = new Map();
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  // Get the best available RPC connection
  async getOptimalConnection(commitmentConfig = null) {
    await this.performHealthCheck();
    
    // Sort RPCs by health score (weight * success rate / failure rate)
    const scoredRPCs = ENHANCED_RPC_ENDPOINTS.map(rpc => {
      const health = this.rpcHealth.get(rpc.url) || 0;
      const failures = this.failureCounts.get(rpc.url) || 0;
      const successes = this.successCounts.get(rpc.url) || 0;
      
      let score = rpc.weight * (successes + 1) / (failures + 1);
      if (health === 0) score = 0; // Unhealthy RPCs get 0 score
      
      return { ...rpc, score };
    }).sort((a, b) => b.score - a.score);

    // Try the highest scoring RPC first
    for (const rpc of scoredRPCs) {
      if (rpc.score > 0) {
        try {
          const connection = await this.getConnection(rpc.url, commitmentConfig);
          if (connection) {
            console.log(`[ENHANCED_RPC] Using ${rpc.name} (score: ${rpc.score.toFixed(2)})`);
            return connection;
          }
        } catch (error) {
          console.log(`[ENHANCED_RPC] Failed to connect to ${rpc.name}:`, error.message);
          this.recordFailure(rpc.url);
        }
      }
    }

    throw new Error('All RPC endpoints are unhealthy');
  }

  // Get connection for specific RPC endpoint
  async getConnection(rpcUrl, commitmentConfig = null) {
    try {
      // Validate RPC URL format
      if (!rpcUrl || typeof rpcUrl !== 'string') {
        throw new Error('Invalid RPC URL provided');
      }
      
      // Basic URL validation
      try {
        new URL(rpcUrl);
      } catch (urlError) {
        throw new Error(`Invalid RPC URL format: ${rpcUrl}`);
      }
      
      // Use provided commitment config or default to confirmed
      const config = commitmentConfig || {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 120000,
        disableRetryOnRateLimit: false
      };
      
      const connection = new Connection(rpcUrl, config);
      
      // Test the connection with a simple RPC call
      try {
        await connection.getSlot();
        console.log(`[ENHANCED_RPC] Successfully connected to ${rpcUrl}`);
        return connection;
      } catch (testError) {
        throw new Error(`RPC endpoint test failed: ${testError.message}`);
      }
      
    } catch (error) {
      console.log(`[ENHANCED_RPC] Failed to create connection for ${rpcUrl}: ${error.message}`);
      this.recordFailure(rpcUrl);
      throw error;
    }
  }

  // Perform health check on all RPCs
  async performHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return; // Skip if health check was recent
    }

    console.log('[ENHANCED_RPC] Performing health check on all endpoints...');
    
    const healthPromises = ENHANCED_RPC_ENDPOINTS.map(async (rpc) => {
      try {
        // Use default commitment for health checks
        const connection = new Connection(rpc.url, { commitment: 'confirmed' });
        const start = Date.now();
        await connection.getLatestBlockhash('confirmed');
        const latency = Date.now() - start;
        
        // Mark as healthy if latency < 2 seconds
        const isHealthy = latency < 2000;
        this.rpcHealth.set(rpc.url, isHealthy ? 1 : 0);
        
        console.log(`[ENHANCED_RPC] ${rpc.name}: ${isHealthy ? 'HEALTHY' : 'SLOW'} (${latency}ms)`);
        return { url: rpc.url, healthy: isHealthy, latency };
      } catch (error) {
        this.rpcHealth.set(rpc.url, 0);
        console.log(`[ENHANCED_RPC] ${rpc.name}: UNHEALTHY (${error.message})`);
        return { url: rpc.url, healthy: false, latency: Infinity };
      }
    });

    await Promise.allSettled(healthPromises);
    this.lastHealthCheck = now;
  }

  // Record RPC success
  recordSuccess(rpcUrl) {
    const current = this.successCounts.get(rpcUrl) || 0;
    this.successCounts.set(rpcUrl, current + 1);
  }

  // Record RPC failure
  recordFailure(rpcUrl) {
    const current = this.failureCounts.get(rpcUrl) || 0;
    this.failureCounts.set(rpcUrl, current + 1);
  }

  // Get RPC statistics
  getRPCStats() {
    const stats = {};
    ENHANCED_RPC_ENDPOINTS.forEach(rpc => {
      const health = this.rpcHealth.get(rpc.url) || 0;
      const failures = this.failureCounts.get(rpc.url) || 0;
      const successes = this.successCounts.get(rpc.url) || 0;
      
      stats[rpc.name] = {
        url: rpc.url,
        priority: rpc.priority,
        weight: rpc.weight,
        healthy: health === 1,
        successRate: successes / (successes + failures + 1),
        totalRequests: successes + failures
      };
    });
    return stats;
  }

  // Reset failure counts (useful for recovery)
  resetFailureCounts() {
    this.failureCounts.clear();
    console.log('[ENHANCED_RPC] Reset all failure counts');
  }
}

export default EnhancedRPCManager;
