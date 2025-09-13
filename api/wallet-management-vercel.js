// Vercel-compatible wallet management handler
// Routes to the main wallet management functionality

export default async function handler(req, res) {
  try {
    // Dynamic import to avoid issues with Vercel's serverless environment
    const { default: walletManagementHandler } = await import('./wallet-management.js');
    return await walletManagementHandler(req, res);
  } catch (error) {
    console.error('[VERCEL] Failed to load wallet management handler:', error);
    res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Failed to load wallet management module'
    });
  }
}
