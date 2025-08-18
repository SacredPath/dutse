#!/usr/bin/env node

// Test Mobile Backlink Functionality
// Run with: node test-mobile-backlinks.js

console.log('🧪 Testing Mobile Backlink Functionality...\n');

// Test the deep link generation for each wallet type
function testDeepLinkGeneration() {
  console.log('1️⃣ Testing Deep Link Generation...');
  
  const testUrl = 'https://example.com/mint';
  const walletTypes = ['phantom', 'solflare', 'backpack', 'trustwallet', 'glow', 'exodus'];
  
  walletTypes.forEach(walletType => {
    let deepLink = '';
    let fallbackUrl = '';
    
    switch(walletType) {
      case 'phantom':
        deepLink = 'phantom://browse/' + encodeURIComponent(testUrl);
        fallbackUrl = 'https://phantom.app/ul/browse/' + encodeURIComponent(testUrl);
        break;
      case 'solflare':
        deepLink = 'solflare://browse/' + encodeURIComponent(testUrl);
        fallbackUrl = 'https://solflare.com/ul/browse/' + encodeURIComponent(testUrl);
        break;
      case 'backpack':
        deepLink = 'backpack://app?url=' + encodeURIComponent(testUrl);
        fallbackUrl = 'https://backpack.app/ul/app?url=' + encodeURIComponent(testUrl);
        break;
      case 'trustwallet':
        deepLink = 'trust://open?url=' + encodeURIComponent(testUrl);
        fallbackUrl = 'https://link.trustwallet.com/open_url?coin_id=501&url=' + encodeURIComponent(testUrl);
        break;
      case 'glow':
        deepLink = 'glow://app/' + encodeURIComponent(testUrl);
        fallbackUrl = 'https://glow.app/ul/app/' + encodeURIComponent(testUrl);
        break;
      case 'exodus':
        deepLink = 'exodus://dapp/' + encodeURIComponent(testUrl);
        fallbackUrl = 'https://exodus.com/app/dapp?url=' + encodeURIComponent(testUrl);
        break;
    }
    
    console.log(`   ${walletType.toUpperCase()}:`);
    console.log(`     Deep Link: ${deepLink}`);
    console.log(`     Fallback: ${fallbackUrl}`);
    console.log('');
  });
}

// Test URL encoding
function testUrlEncoding() {
  console.log('2️⃣ Testing URL Encoding...');
  
  const testUrls = [
    'https://example.com/mint',
    'https://example.com/mint?param=value',
    'https://example.com/mint#section',
    'https://example.com/mint?param=value&another=123#section'
  ];
  
  testUrls.forEach(url => {
    const encoded = encodeURIComponent(url);
    console.log(`   Original: ${url}`);
    console.log(`   Encoded: ${encoded}`);
    console.log(`   Decoded: ${decodeURIComponent(encoded)}`);
    console.log('');
  });
}

// Test the openInWallet function logic
function testOpenInWalletLogic() {
  console.log('3️⃣ Testing openInWallet Function Logic...');
  
  console.log('   Function should:');
  console.log('     1. Generate deep link for wallet type');
  console.log('     2. Try window.open(deepLink, "_blank") first');
  console.log('     3. Fallback to window.location.href if window.open fails');
  console.log('     4. Handle errors gracefully');
  console.log('');
  
  console.log('   Expected behavior:');
  console.log('     - iOS Safari: May open deep link or fallback to App Store');
  console.log('     - Android Chrome: May open deep link or show app chooser');
  console.log('     - Desktop: May show "protocol not supported" or open wallet');
  console.log('');
}

// Test mobile detection
function testMobileDetection() {
  console.log('4️⃣ Testing Mobile Detection...');
  
  // Simulate different user agents
  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];
  
  userAgents.forEach((ua, index) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    
    console.log(`   User Agent ${index + 1}:`);
    console.log(`     Is Mobile: ${isMobile}`);
    console.log(`     Is iOS: ${isIOS}`);
    console.log(`     Is Android: ${isAndroid}`);
    console.log(`     UA: ${ua.substring(0, 80)}...`);
    console.log('');
  });
}

// Test wallet detection fallback
function testWalletDetectionFallback() {
  console.log('5️⃣ Testing Wallet Detection Fallback...');
  
  console.log('   When no wallets detected:');
  console.log('     1. showWalletBrowserPrompt() is called');
  console.log('     2. Modal shows with wallet options');
  console.log('     3. Each wallet button calls openInWallet(walletType)');
  console.log('     4. Deep links are generated and attempted');
  console.log('     5. Fallback URLs are available for each wallet');
  console.log('');
  
  console.log('   Fallback URLs:');
  console.log('     - Phantom: https://phantom.app/ul/browse/[url]');
  console.log('     - Solflare: https://solflare.com/ul/browse/[url]');
  console.log('     - Backpack: https://backpack.app/ul/app?url=[url]');
  console.log('     - Trust Wallet: https://link.trustwallet.com/open_url?coin_id=501&url=[url]');
  console.log('     - Glow: https://glow.app/ul/app/[url]');
  console.log('     - Exodus: https://exodus.com/app/dapp?url=[url]');
  console.log('');
}

// Run all tests
function runAllTests() {
  testDeepLinkGeneration();
  testUrlEncoding();
  testOpenInWalletLogic();
  testMobileDetection();
  testWalletDetectionFallback();
  
  console.log('✅ Mobile backlink testing complete!');
  console.log('');
  console.log('📱 To test on actual mobile devices:');
  console.log('   1. Open the site on iOS/Android');
  console.log('   2. Click MINT button');
  console.log('   3. If no wallet detected, showWalletBrowserPrompt appears');
  console.log('   4. Click any wallet button to test deep links');
  console.log('   5. Check console for deep link attempts');
  console.log('');
  console.log('🔗 Deep links will attempt to open wallet apps');
  console.log('   Fallbacks will redirect to wallet websites');
}

// Run tests
runAllTests();
