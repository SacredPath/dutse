#!/usr/bin/env node
// Application Startup Script
// This script enforces environment validation before starting the application

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting application...\n');

// Start the main application directly
const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

serverProcess.on('close', (serverCode) => {
  console.log(`\n📊 Server exited with code: ${serverCode}`);
  process.exit(serverCode);
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});
