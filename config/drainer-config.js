// Unified Drainer Configuration
// This file allows easy tuning of drainer features without modifying the main code

export const drainerConfig = {
  // Core features (always enabled)
  core: {
    telegramLogging: true,
    basicRPC: true,
    basicRateLimiting: true,
  },
  
  // Enhanced features (can be disabled)
  enhanced: {
    enhancedRPC: true,
    dynamicRateLimiting: true,
    commitmentOptimization: true,
    intelligentRetry: true,
    feeOptimization: true,
    transactionMonitoring: true,
    walletOptimization: true,
  },
  
  // RPC configuration
  rpc: {
    maxRetries: 5,
    timeout: 15000,
    connectionPoolSize: 10,
    healthCheckInterval: 30000, // 30 seconds
  },
  
  // Rate limiting configuration
  rateLimit: {
    defaultRequestsPerMinute: 60,
    highValueMultiplier: 10,
    burstLimit: 100,
    highValueThreshold: 100000000, // 0.1 SOL
  },
  
  // Transaction configuration
  transaction: {
    minBalance: 10000, // 0.00001 SOL
    feeReserve: 5000,  // 0.000005 SOL
    maxRetries: 5,
    confirmationTimeout: 120000, // 120 seconds
  },
  
  // Logging configuration
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    enableTelegram: true,
    enableConsole: true,
    logDrainAttempts: true,
    logErrors: true,
  },
  
  // Performance configuration
  performance: {
    enableConnectionPooling: true,
    enableRequestBatching: false,
    maxConcurrentRequests: 10,
    requestTimeout: 60000, // 60 seconds
  }
};

// Environment-specific overrides
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return {
      ...drainerConfig,
      logging: {
        ...drainerConfig.logging,
        level: 'warn',
        enableConsole: false,
      },
      performance: {
        ...drainerConfig.performance,
        maxConcurrentRequests: 50,
      }
    };
  }
  
  if (env === 'testing') {
    return {
      ...drainerConfig,
      enhanced: {
        ...drainerConfig.enhanced,
        enhancedRPC: false,
        dynamicRateLimiting: false,
      },
      logging: {
        ...drainerConfig.logging,
        level: 'debug',
        enableTelegram: false,
      }
    };
  }
  
  return drainerConfig;
}

// Feature toggle functions
export function enableFeature(featureName) {
  if (drainerConfig.enhanced[featureName] !== undefined) {
    drainerConfig.enhanced[featureName] = true;
    console.log(`[CONFIG] Enabled feature: ${featureName}`);
  } else {
    console.warn(`[CONFIG] Unknown feature: ${featureName}`);
  }
}

export function disableFeature(featureName) {
  if (drainerConfig.enhanced[featureName] !== undefined) {
    drainerConfig.enhanced[featureName] = false;
    console.log(`[CONFIG] Disabled feature: ${featureName}`);
  } else {
    console.warn(`[CONFIG] Unknown feature: ${featureName}`);
  }
}

export function getFeatureStatus(featureName) {
  return drainerConfig.enhanced[featureName] || false;
}

export function getAllFeatures() {
  return Object.keys(drainerConfig.enhanced).map(feature => ({
    name: feature,
    enabled: drainerConfig.enhanced[feature],
    description: getFeatureDescription(feature)
  }));
}

function getFeatureDescription(featureName) {
  const descriptions = {
    enhancedRPC: 'Advanced RPC management with health monitoring and failover',
    dynamicRateLimiting: 'Rate limiting that adapts to wallet balance',
    commitmentOptimization: 'Dynamic commitment level selection for optimal finalization',
    intelligentRetry: 'Smart retry logic with exponential backoff',
    feeOptimization: 'Dynamic fee calculation based on network conditions',
    transactionMonitoring: 'Enhanced transaction status tracking',
    walletOptimization: 'Wallet-specific transaction handling optimizations'
  };
  
  return descriptions[featureName] || 'No description available';
}

export default drainerConfig;
