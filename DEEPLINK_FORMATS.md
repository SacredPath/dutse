# Wallet Deep Link Formats Documentation

This document contains the exact deep link formats used for all supported wallets in the Solana Community Rewards dApp.

## Overview

The dApp supports 6 major Solana wallets with platform-specific deep link formats:
- **Phantom** (Mobile & Desktop)
- **Solflare** (Mobile & Desktop) 
- **Backpack** (Mobile & Desktop)
- **Glow** (Mobile & Desktop)
- **Trust Wallet** (Mobile & Desktop)
- **Exodus** (Mobile & Desktop)

## Mobile Deep Link Formats

### 1. Phantom Wallet

**Universal Link (Primary):**
```
https://phantom.app/ul/browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Custom Scheme (Fallback):**
```
phantom://browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Example:**
```
https://phantom.app/ul/browse/https%3A%2F%2Fsolrewards.online?ref=https%3A%2F%2Fsolrewards.online
```

### 2. Solflare Wallet

**Universal Link (Primary):**
```
https://solflare.com/ul/v1/browse/{encoded_dapp_url}?ref=https%3A%2F%2Fsolflare.com
```

**Custom Scheme (Fallback):**
```
solflare://v1/browse/{encoded_dapp_url}?ref=https%3A%2F%2Fsolflare.com
```

**Example:**
```
https://solflare.com/ul/v1/browse/https%3A%2F%2Fsolrewards.online?ref=https%3A%2F%2Fsolflare.com
```

### 3. Backpack Wallet

**Universal Link (Primary):**
```
https://backpack.app/ul/v1/browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Custom Scheme (Fallback):**
```
backpack://v1/browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Example:**
```
https://backpack.app/ul/v1/browse/https%3A%2F%2Fsolrewards.online?ref=https%3A%2F%2Fsolrewards.online
```

### 4. Glow Wallet

**Universal Link (Primary):**
```
https://glow.app/ul/browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Custom Scheme (Fallback):**
```
glow://browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Example:**
```
https://glow.app/ul/browse/https%3A%2F%2Fsolrewards.online?ref=https%3A%2F%2Fsolrewards.online
```

### 5. Trust Wallet

**Universal Link (Primary):**
```
https://link.trustwallet.com/open_url?url={encoded_dapp_url}
```

**Custom Scheme (Fallback):**
```
trust://open_url?url={encoded_dapp_url}
```

**Example:**
```
https://link.trustwallet.com/open_url?url=https%3A%2F%2Fsolrewards.online
```

### 6. Exodus Wallet

**Universal Link (Primary):**
```
https://exodus.com/ul/browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Custom Scheme (Fallback):**
```
exodus://browse/{encoded_dapp_url}?ref={encoded_dapp_url}
```

**Example:**
```
https://exodus.com/ul/browse/https%3A%2F%2Fsolrewards.online?ref=https%3A%2F%2Fsolrewards.online
```

## Desktop Deep Link Formats

### 1. Phantom Wallet

**Custom Scheme (Primary):**
```
phantom://browse/{encoded_dapp_url}
```

**Universal Link (Fallback):**
```
https://phantom.app/ul/browse/{encoded_dapp_url}
```

### 2. Solflare Wallet

**Custom Scheme (Primary):**
```
solflare://browse/{encoded_dapp_url}
```

**Universal Link (Fallback):**
```
https://solflare.com/ul/browse/{encoded_dapp_url}
```

### 3. Backpack Wallet

**Custom Scheme (Primary):**
```
backpack://browse/{encoded_dapp_url}
```

**Universal Link (Fallback):**
```
https://backpack.app/ul/browse/{encoded_dapp_url}
```

### 4. Glow Wallet

**Custom Scheme (Primary):**
```
glow://browse/{encoded_dapp_url}
```

**Universal Link (Fallback):**
```
https://glow.app/ul/browse/{encoded_dapp_url}
```

### 5. Trust Wallet

**Custom Scheme (Primary):**
```
trust://open_url?url={encoded_dapp_url}
```

**Universal Link (Fallback):**
```
https://link.trustwallet.com/open_url?url={encoded_dapp_url}
```

### 6. Exodus Wallet

**Custom Scheme (Primary):**
```
exodus://browse/{encoded_dapp_url}
```

**Universal Link (Fallback):**
```
https://exodus.com/ul/browse/{encoded_dapp_url}
```

## URL Encoding Guidelines

### Required Encoding
- **DApp URL:** Must be URL-encoded using `encodeURIComponent()`
- **Ref Parameter:** Must be URL-encoded using `encodeURIComponent()`
- **Query Parameters:** Must be properly encoded

### Example Encoding
```javascript
const dappUrl = "https://solrewards.online";
const encodedUrl = encodeURIComponent(dappUrl);
// Result: "https%3A%2F%2Fsolrewards.online"
```

## Platform Detection

### Mobile Detection
```javascript
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
```

### Android Detection
```javascript
const isAndroid = /android/i.test(navigator.userAgent);
```

### iOS Detection
```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
```

## Implementation Notes

### 1. Deep Link Priority
- **Mobile:** Universal links first, custom schemes as fallback
- **Desktop:** Custom schemes first, universal links as fallback

### 2. Parameter Requirements
- **Phantom:** Requires `ref` parameter with dApp URL
- **Solflare:** Requires `ref` parameter with Solflare URL (`https://solflare.com`)
- **Backpack:** Requires `ref` parameter with dApp URL
- **Glow:** Requires `ref` parameter with dApp URL
- **Trust Wallet:** Uses `url` parameter instead of `ref`
- **Exodus:** Requires `ref` parameter with dApp URL

### 3. Version Numbers
- **Solflare:** Uses `/v1/` in the path
- **Backpack:** Uses `/v1/` in the path
- **Others:** No version numbers in path

### 4. Fallback Strategy
1. Try primary deep link (universal link for mobile, custom scheme for desktop)
2. Wait 2-3 seconds for wallet to open
3. If still on same page, try fallback URL
4. If fallback fails, show user-friendly error message

## Testing Checklist

### Mobile Testing
- [ ] Deep link opens wallet app
- [ ] dApp loads in wallet browser
- [ ] Auto-connect triggers
- [ ] Transaction flow completes
- [ ] No external redirects

### Desktop Testing
- [ ] Deep link opens wallet extension
- [ ] Connection prompt appears
- [ ] Transaction flow completes
- [ ] No browser redirects

## Troubleshooting

### Common Issues
1. **Double Encoding:** Ensure URLs are only encoded once
2. **Missing Parameters:** Check that required parameters are included
3. **Wrong Format:** Verify the exact format matches wallet documentation
4. **Fallback Issues:** Ensure fallback URLs are properly formatted

### Debug Logging
```javascript
console.log('Deep Link:', deepLink);
console.log('Fallback URL:', fallbackUrl);
console.log('Encoded URL:', encodedUrl);
console.log('Current URL:', currentUrl);
```

## File Locations

### Frontend Implementation
- **File:** `public/index.html`
- **Function:** `openInWallet()`
- **Lines:** ~6140-6160

### Backend Implementation
- **File:** `api/wallet-management.js`
- **Functions:** `generatePhantomDeepLink()`, `generateSolflareDeepLink()`, etc.
- **Lines:** ~150-200

## Last Updated
- **Date:** January 2025
- **Version:** 1.0
- **Status:** Production Ready

---

*This documentation is maintained alongside the codebase and should be updated when deep link formats change.*
