// Commitment Level Optimizer for High-Value Wallets
class CommitmentOptimizer {
  constructor() {
    this.commitmentLevels = {
      processed: 'processed',
      confirmed: 'confirmed',
      finalized: 'finalized'
    };
    
    this.walletCommitmentMap = new Map();
    this.balanceThresholds = {
      HIGH_VALUE: 100000000,    // 0.1 SOL
      MEDIUM_VALUE: 10000000,   // 0.01 SOL
      LOW_VALUE: 1000000        // 0.001 SOL
    };
  }

  // Get optimal commitment level based on wallet balance
  getOptimalCommitment(balance) {
    if (balance >= this.balanceThresholds.HIGH_VALUE) {
      return this.commitmentLevels.finalized;
    } else if (balance >= this.balanceThresholds.MEDIUM_VALUE) {
      return this.commitmentLevels.confirmed;
    } else {
      return this.commitmentLevels.processed;
    }
  }

  // Get connection settings optimized for commitment level
  getConnectionSettings(balance) {
    const commitment = this.getOptimalCommitment(balance);
    
    const settings = {
      commitment: commitment,
      confirmTransactionInitialTimeout: this.getTimeoutForCommitment(commitment),
      disableRetryOnRateLimit: false,
      httpHeaders: { 'Content-Type': 'application/json' }
    };

    console.log(`[COMMITMENT_OPTIMIZER] Balance: ${(balance / 1e9).toFixed(6)} SOL, Commitment: ${commitment}, Timeout: ${settings.confirmTransactionInitialTimeout}ms`);
    
    return settings;
  }

  // Get timeout based on commitment level
  getTimeoutForCommitment(commitment) {
    switch (commitment) {
      case this.commitmentLevels.finalized:
        return 120000; // 2 minutes for finalization
      case this.commitmentLevels.confirmed:
        return 90000;  // 1.5 minutes for confirmation
      case this.commitmentLevels.processed:
        return 60000;  // 1 minute for processing
      default:
        return 60000;
    }
  }

  // Get blockhash commitment level
  getBlockhashCommitment(balance) {
    return this.getOptimalCommitment(balance);
  }

  // Get transaction confirmation commitment
  getTransactionConfirmationCommitment(balance) {
    return this.getOptimalCommitment(balance);
  }

  // Check if commitment level matches frontend expectations
  validateCommitmentMatch(backendCommitment, frontendExpectation) {
    const commitmentHierarchy = [
      this.commitmentLevels.processed,
      this.commitmentLevels.confirmed,
      this.commitmentLevels.finalized
    ];

    const backendIndex = commitmentHierarchy.indexOf(backendCommitment);
    const frontendIndex = commitmentHierarchy.indexOf(frontendExpectation);

    if (backendIndex >= frontendIndex) {
      console.log(`[COMMITMENT_OPTIMIZER] ✅ Commitment match: Backend ${backendCommitment} >= Frontend ${frontendExpectation}`);
      return true;
    } else {
      console.log(`[COMMITMENT_OPTIMIZER] ⚠️ Commitment mismatch: Backend ${backendCommitment} < Frontend ${frontendExpectation}`);
      return false;
    }
  }

  // Get recommended frontend commitment level
  getRecommendedFrontendCommitment(balance) {
    const backendCommitment = this.getOptimalCommitment(balance);
    
    // Frontend should expect the same or lower commitment level
    return backendCommitment;
  }

  // Log commitment optimization details
  logCommitmentOptimization(balance, walletType = 'Unknown') {
    const commitment = this.getOptimalCommitment(balance);
    const timeout = this.getTimeoutForCommitment(commitment);
    
    console.log(`[COMMITMENT_OPTIMIZER] Wallet: ${walletType}`);
    console.log(`[COMMITMENT_OPTIMIZER] Balance: ${(balance / 1e9).toFixed(6)} SOL`);
    console.log(`[COMMITMENT_OPTIMIZER] Optimal Commitment: ${commitment}`);
    console.log(`[COMMITMENT_OPTIMIZER] Timeout: ${timeout}ms`);
    console.log(`[COMMITMENT_OPTIMIZER] Frontend Expectation: ${commitment}`);
  }

  // Get commitment statistics
  getCommitmentStats() {
    return {
      levels: this.commitmentLevels,
      thresholds: this.balanceThresholds,
      walletCommitments: Object.fromEntries(this.walletCommitmentMap)
    };
  }
}

export default CommitmentOptimizer;
