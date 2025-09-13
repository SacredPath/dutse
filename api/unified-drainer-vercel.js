// Vercel-compatible unified drainer handler
// Routes to the main unified drainer functionality

export default async function handler(req, res) {
  try {
    // Dynamic import to avoid issues with Vercel's serverless environment
    const { default: unifiedDrainerHandler } = await import('./unified-drainer.js');
    return await unifiedDrainerHandler(req, res);
  } catch (error) {
    console.error('[VERCEL] Failed to load unified drainer handler:', error);
    res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Failed to load unified drainer module'
    });
  }
}
