// Vercel Serverless Function for dashboard
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authorization check (simplified)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // PRODUCTION NOTE: In a real application, this data would come from database queries
    // For example:
    // - SELECT COUNT(*) FROM materials
    // - SELECT COUNT(*) FROM equipment
    // - SELECT COUNT(*) FROM orders WHERE status = 'pending'
    // - SELECT * FROM materials WHERE current_stock <= reorder_level
    
    // Only handle GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // In production, return empty data
    return res.status(200).json({
      stats: {
        totalMaterials: 0,
        totalEquipment: 0,
        pendingOrders: 0,
        lowStockItems: 0
      },
      lowStockMaterials: [],
      recentOrders: []
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 