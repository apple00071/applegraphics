// Vercel Serverless Function for orders
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
    // PRODUCTION NOTE: In a real application, these endpoints should connect to a database
    // For demo purposes only, using minimal hardcoded data
    
    // GET /api/orders
    if (req.method === 'GET' && !req.query.id) {
      // PRODUCTION NOTE: Replace with database query - e.g., SELECT * FROM orders
      // In production, return empty array
      return res.status(200).json([]);
    }
    
    // GET /api/orders/:id
    if (req.method === 'GET' && req.query.id) {
      // PRODUCTION NOTE: Replace with database query - e.g., SELECT * FROM orders WHERE id = ?
      // In production, return 404 as we don't have real data
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // POST /api/orders
    if (req.method === 'POST') {
      // PRODUCTION NOTE: Replace with database insertion - e.g., INSERT INTO orders
      return res.status(201).json({
        id: 999,
        ...req.body,
        order_date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Other methods
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 