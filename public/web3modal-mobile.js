// Web3Modal implementation for mobile browser wallet connections
// This provides a more reliable alternative to deep linking for mobile devices

class MobileWeb3Modal {
  constructor() {
    this.isMobile = this.detectMobile();
    this.wallets = this.getMobileWallets();
    this.modal = null;
    this.selectedWallet = null;
  }

  // Detect if user is on mobile device
  detectMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
           /mobile|tablet/i.test(userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
           window.innerWidth <= 768;
  }

  // Get mobile-optimized wallet configurations
  getMobileWallets() {
    return [
      {
        id: 'phantom',
        name: 'Phantom',
        logo: '/phantom-logo.png',
        description: 'Popular Solana wallet',
        downloadLink: {
          ios: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
          android: 'https://play.google.com/store/apps/details?id=app.phantom'
        },
        deepLink: 'phantom://browse/',
        universalLink: 'https://phantom.app/ul/browse/',
        provider: () => window.phantom || window.solana
      },
      {
        id: 'backpack',
        name: 'Backpack',
        logo: '/backpack-logo.png',
        description: 'Modern Solana wallet',
        downloadLink: {
          ios: 'https://apps.apple.com/app/backpack-crypto-wallet/id6446603434',
          android: 'https://play.google.com/store/apps/details?id=com.backpack.app'
        },
        deepLink: 'backpack://app?url=',
        universalLink: 'https://backpack.app/ul/app?url=',
        provider: () => window.backpack
      },
      {
        id: 'solflare',
        name: 'Solflare',
        logo: '/solflare-logo.png',
        description: 'Secure Solana wallet',
        downloadLink: {
          ios: 'https://apps.apple.com/app/solflare/id1580902717',
          android: 'https://play.google.com/store/apps/details?id=com.solflare.mobile'
        },
        deepLink: 'solflare://browse/',
        universalLink: 'https://solflare.com/ul/browse/',
        provider: () => window.solflare
      },
      {
        id: 'glow',
        name: 'Glow',
        logo: '/glow-logo.png',
        description: 'Lightweight Solana wallet',
        downloadLink: {
          ios: 'https://apps.apple.com/app/glow-solana-wallet/id1634119564',
          android: 'https://play.google.com/store/apps/details?id=com.glow.app'
        },
        deepLink: 'glow://app/',
        universalLink: 'https://glow.app/ul/app/',
        provider: () => window.glow
      },
      {
        id: 'trustwallet',
        name: 'Trust Wallet',
        logo: '/trust-logo.png',
        description: 'Multi-chain wallet',
        downloadLink: {
          ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
          android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
        },
        deepLink: 'trust://open?url=',
        universalLink: 'https://link.trustwallet.com/open_url?coin_id=501&url=',
        provider: () => window.trustwallet
      },
      {
        id: 'exodus',
        name: 'Exodus',
        logo: '/exodus-logo.png',
        description: 'Desktop & mobile wallet',
        downloadLink: {
          ios: 'https://apps.apple.com/app/exodus-crypto-bitcoin-wallet/id1414384820',
          android: 'https://play.google.com/store/apps/details?id=exodusmovement.exodus'
        },
        deepLink: 'exodus://dapp/',
        universalLink: 'https://exodus.com/app/dapp?url=',
        provider: () => window.exodus
      }
    ];
  }

  // Show the mobile wallet selection modal
  showModal() {
    if (!this.isMobile) {
      console.log('[WEB3MODAL] Not mobile device, skipping modal');
      return false;
    }

    this.createModal();
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    return true;
  }

  // Create the modal HTML
  createModal() {
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
    `;

    modalContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">
          Connect Wallet
        </h2>
        <p style="color: #888; margin: 0; font-size: 14px;">
          Choose your Solana wallet to continue
        </p>
      </div>
      
      <div style="display: grid; gap: 12px; margin-bottom: 24px;">
        ${this.wallets.map(wallet => `
          <button class="wallet-option" data-wallet="${wallet.id}" 
                  style="display: flex; align-items: center; padding: 16px; 
                         background: #2a2a2a; border: 1px solid #333; 
                         border-radius: 12px; color: white; cursor: pointer;
                         transition: all 0.2s ease; width: 100%;">
            <img src="${wallet.logo}" alt="${wallet.name}" 
                 style="width: 32px; height: 32px; margin-right: 12px; border-radius: 8px;">
            <div style="flex: 1; text-align: left;">
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 2px;">
                ${wallet.name}
              </div>
              <div style="color: #888; font-size: 12px;">
                ${wallet.description}
              </div>
            </div>
            <div style="color: #4ade80; font-size: 12px;">
              Connect
            </div>
          </button>
        `).join('')}
      </div>
      
      <div style="text-align: center;">
        <button id="close-modal" 
                style="background: #333; color: white; border: none; 
                       padding: 12px 24px; border-radius: 8px; 
                       cursor: pointer; font-size: 14px;">
          Cancel
        </button>
      </div>
    `;

    this.modal.appendChild(modalContent);
    document.body.appendChild(this.modal);

    // Add event listeners
    this.addEventListeners();
  }

  // Add event listeners to modal
  addEventListeners() {
    // Wallet option clicks
    this.modal.querySelectorAll('.wallet-option').forEach(button => {
      button.addEventListener('click', (e) => {
        const walletId = e.currentTarget.dataset.wallet;
        this.handleWalletSelection(walletId);
      });

      // Hover effects
      button.addEventListener('mouseenter', (e) => {
        e.currentTarget.style.background = '#3a3a3a';
        e.currentTarget.style.borderColor = '#4ade80';
      });

      button.addEventListener('mouseleave', (e) => {
        e.currentTarget.style.background = '#2a2a2a';
        e.currentTarget.style.borderColor = '#333';
      });
    });

    // Close button
    this.modal.querySelector('#close-modal').addEventListener('click', () => {
      this.hideModal();
    });

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
        this.hideModal();
      }
    });
  }

  // Handle wallet selection
  async handleWalletSelection(walletId) {
    const wallet = this.wallets.find(w => w.id === walletId);
    if (!wallet) return;

    this.selectedWallet = wallet;
    this.hideModal();

    // Check if wallet is installed
    const provider = wallet.provider();
    if (provider) {
      // Wallet is installed, try to connect
      await this.connectWallet(wallet, provider);
    } else {
      // Wallet not installed, show download options
      this.showDownloadOptions(wallet);
    }
  }

  // Connect to wallet
  async connectWallet(wallet, provider) {
    try {
      console.log(`[WEB3MODAL] Connecting to ${wallet.name}...`);
      
      // Show connecting status
      this.showStatus('Connecting...', 'loading');

      // Try different connection methods
      let result;
      if (typeof provider.connect === 'function') {
        result = await provider.connect();
      } else if (typeof provider.request === 'function') {
        result = await provider.request({ method: 'connect' });
      } else {
        throw new Error('No connection method available');
      }

      const publicKey = result?.publicKey || provider.publicKey;
      if (publicKey) {
        console.log(`[WEB3MODAL] Connected to ${wallet.name}:`, publicKey);
        this.showStatus('Connected!', 'success');
        
        // Trigger the main wallet connection flow
        window.triggerWalletConnection(wallet.id, publicKey);
      } else {
        throw new Error('No public key received');
      }
    } catch (error) {
      console.error(`[WEB3MODAL] Connection failed:`, error);
      this.showStatus('Connection failed', 'error');
    }
  }

  // Show download options for uninstalled wallet
  showDownloadOptions(wallet) {
    const platform = this.detectPlatform();
    const downloadUrl = wallet.downloadLink[platform] || wallet.downloadLink.ios;

    const downloadModal = document.createElement('div');
    downloadModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    downloadModal.innerHTML = `
      <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 16px; 
                  padding: 24px; max-width: 350px; width: 90%; text-align: center; color: white;">
        <img src="${wallet.logo}" alt="${wallet.name}" 
             style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 12px;">
        <h3 style="color: #fff; margin: 0 0 8px 0; font-size: 20px;">
          Install ${wallet.name}
        </h3>
        <p style="color: #888; margin: 0 0 24px 0; font-size: 14px;">
          You need to install ${wallet.name} to connect your wallet.
        </p>
        <div style="display: flex; gap: 12px;">
          <button id="download-wallet" 
                  style="flex: 1; background: #4ade80; color: white; border: none; 
                         padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
            Download
          </button>
          <button id="cancel-download" 
                  style="flex: 1; background: #333; color: white; border: none; 
                         padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(downloadModal);

    // Event listeners
    downloadModal.querySelector('#download-wallet').addEventListener('click', () => {
      window.open(downloadUrl, '_blank');
      downloadModal.remove();
    });

    downloadModal.querySelector('#cancel-download').addEventListener('click', () => {
      downloadModal.remove();
    });

    downloadModal.addEventListener('click', (e) => {
      if (e.target === downloadModal) {
        downloadModal.remove();
      }
    });
  }

  // Detect platform (iOS/Android)
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    }
    return 'ios'; // Default to iOS
  }

  // Show status message
  showStatus(message, type = 'info') {
    // Remove existing status
    const existingStatus = document.querySelector('.web3modal-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    const status = document.createElement('div');
    status.className = 'web3modal-status';
    status.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
    `;
    status.textContent = message;

    document.body.appendChild(status);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (status.parentElement) {
        status.remove();
      }
    }, 3000);
  }

  // Hide modal
  hideModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // Public method to trigger wallet connection
  async connectWallet(walletId) {
    if (this.isMobile) {
      this.showModal();
    } else {
      // Fall back to desktop connection method
      console.log('[WEB3MODAL] Desktop device, using standard connection');
      return false;
    }
  }
}

// Export for global use
window.MobileWeb3Modal = MobileWeb3Modal;

// Test function for debugging
window.testWeb3Modal = function() {
  console.log('[TEST] Testing Web3Modal...');
  const modal = new MobileWeb3Modal();
  console.log('[TEST] Modal created:', modal);
  console.log('[TEST] Is mobile:', modal.isMobile);
  console.log('[TEST] Wallets:', modal.wallets);
  modal.showModal();
  return modal;
};

// Auto-initialize if mobile
if (typeof window !== 'undefined') {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
                   /mobile|tablet/i.test(userAgent) ||
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
                   window.innerWidth <= 768;

  console.log('[WEB3MODAL] Initializing...', {
    userAgent: userAgent,
    isMobile: isMobile,
    maxTouchPoints: navigator.maxTouchPoints,
    windowWidth: window.innerWidth
  });

  if (isMobile) {
    console.log('[WEB3MODAL] Mobile device detected, Web3Modal ready');
    window.mobileWeb3Modal = new MobileWeb3Modal();
  } else {
    console.log('[WEB3MODAL] Desktop device detected, Web3Modal available but not auto-initialized');
  }
}
