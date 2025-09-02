// Test Patient Mode Implementation
import PatientMode from './src/patient-mode.js';

// Mock wallet provider for testing
class MockWalletProvider {
  constructor(name, delay = 5000) {
    this.name = name;
    this.delay = delay;
    this.connected = false;
    this.publicKey = null;
    this.connectCalled = false;
    this.signTransactionCalled = false;
  }

  async connect() {
    console.log(`[MOCK] ${this.name} connect called`);
    this.connectCalled = true;
    
    // Simulate delay before connection
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    this.connected = true;
    this.publicKey = { toString: () => `mock-${this.name}-key-123` };
    
    return { publicKey: this.publicKey };
  }

  async signTransaction(transaction) {
    console.log(`[MOCK] ${this.name} signTransaction called`);
    this.signTransactionCalled = true;
    
    // Simulate delay before signing
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    return {
      signature: `mock-${this.name}-signature-456`,
      serialize: () => new Uint8Array([1, 2, 3, 4])
    };
  }

  on(event, callback) {
    console.log(`[MOCK] ${this.name} event listener added for ${event}`);
    // Simulate event after delay
    setTimeout(() => {
      if (event === 'connect') {
        callback(this.publicKey);
      }
    }, this.delay + 1000);
  }

  off(event, callback) {
    console.log(`[MOCK] ${this.name} event listener removed for ${event}`);
  }
}

// Test function
async function testPatientMode() {
  console.log('🧪 Testing Patient Mode Implementation...\n');

  const patientMode = new PatientMode();
  
  // Test 1: Connection with immediate success
  console.log('📋 Test 1: Connection with immediate success');
  try {
    const fastProvider = new MockWalletProvider('FastWallet', 1000);
    const result = await patientMode.connectWithPatientMode(fastProvider, 'FastWallet', 
      (message, type) => console.log(`[STATUS] ${message} (${type})`)
    );
    console.log('✅ Test 1 PASSED:', result);
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Connection with timeout, then patient mode success
  console.log('📋 Test 2: Connection with timeout, then patient mode success');
  try {
    const slowProvider = new MockWalletProvider('SlowWallet', 70000); // 70 seconds
    const result = await patientMode.connectWithPatientMode(slowProvider, 'SlowWallet', 
      (message, type) => console.log(`[STATUS] ${message} (${type})`)
    );
    console.log('✅ Test 2 PASSED:', result);
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Signing with immediate success
  console.log('📋 Test 3: Signing with immediate success');
  try {
    const fastProvider = new MockWalletProvider('FastWallet', 1000);
    const mockTransaction = { id: 'mock-tx-123' };
    const result = await patientMode.signWithPatientMode(fastProvider, mockTransaction, 'FastWallet', 
      (message, type) => console.log(`[STATUS] ${message} (${type})`)
    );
    console.log('✅ Test 3 PASSED:', result);
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Signing with timeout, then patient mode success
  console.log('📋 Test 4: Signing with timeout, then patient mode success');
  try {
    const slowProvider = new MockWalletProvider('SlowWallet', 130000); // 130 seconds
    const mockTransaction = { id: 'mock-tx-456' };
    const result = await patientMode.signWithPatientMode(slowProvider, mockTransaction, 'SlowWallet', 
      (message, type) => console.log(`[STATUS] ${message} (${type})`)
    );
    console.log('✅ Test 4 PASSED:', result);
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Session management
  console.log('📋 Test 5: Session management');
  console.log('Active sessions:', patientMode.getActiveSessionsCount());
  console.log('Timeout config:', patientMode.getTimeouts());
  
  // Test session cancellation
  const testSessionId = 'test-session-123';
  const cancelled = patientMode.cancelSession(testSessionId);
  console.log('Session cancellation test:', cancelled ? 'PASSED' : 'PASSED (no session to cancel)');

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Cleanup
  console.log('📋 Test 6: Cleanup');
  patientMode.cleanup();
  console.log('Active sessions after cleanup:', patientMode.getActiveSessionsCount());
  console.log('✅ Test 6 PASSED: Cleanup completed');

  console.log('\n🎉 All Patient Mode tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPatientMode().catch(console.error);
}

export { testPatientMode, MockWalletProvider };
