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

    // Return minimal sample data for demo purposes
    return res.status(200).json({
      stats: {
        totalMaterials: 8,
        totalEquipment: 12,
        pendingOrders: 3,
        lowStockItems: 2
      },
      lowStockMaterials: [
        { id: 4, name: 'Cyan Ink', current_stock: 15, reorder_level: 5, unit_of_measure: 'liters' },
        { id: 5, name: 'Magenta Ink', current_stock: 18, reorder_level: 5, unit_of_measure: 'liters' }
      ],
      recentOrders: [
        { id: 101, customer_name: 'ABC Corp', order_date: '2023-09-15', status: 'in-progress', total_amount: 1250.00 },
        { id: 102, customer_name: 'XYZ Publishing', order_date: '2023-09-14', status: 'pending', total_amount: 845.50 }
      ]
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 