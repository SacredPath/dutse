#!/usr/bin/env node

// Main Test Entry Point
// Run with: node run-tests.js

import TestRunner from './test-runner.js';

// Main function
async function main() {
  try {
    console.log('🚀 Starting Comprehensive System Testing Framework...\n');
    
    // Create test runner instance
    const testRunner = new TestRunner();
    
    // Initialize test runner
    await testRunner.init();
    
    // Run all tests
    await testRunner.runAllTests();
    
  } catch (error) {
    console.error('❌ Test framework failed to start:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Run tests
main();
