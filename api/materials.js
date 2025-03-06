// Vercel Serverless Function for materials
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
    
    // GET /api/materials
    if (req.method === 'GET' && !req.query.id) {
      // PRODUCTION NOTE: Replace with database query - e.g., SELECT * FROM materials
      // For demo purposes, return minimal sample data
      return res.status(200).json([
        { id: 1, name: 'Matte Paper A4', current_stock: 500, unit_of_measure: 'sheets', reorder_level: 100, unit_price: 0.05, category_id: 1, category_name: 'Paper' },
        { id: 2, name: 'Black Ink', current_stock: 20, unit_of_measure: 'liters', reorder_level: 5, unit_price: 25.00, category_id: 2, category_name: 'Ink' }
      ]);
    }
    
    // GET /api/materials/:id
    if (req.method === 'GET' && req.query.id) {
      // PRODUCTION NOTE: Replace with database query - e.g., SELECT * FROM materials WHERE id = ?
      return res.status(200).json({
        id: parseInt(req.query.id),
        name: 'Sample Material',
        current_stock: 100,
        unit_of_measure: 'units',
        reorder_level: 20,
        unit_price: 10.00,
        category_id: 1,
        category_name: 'Sample Category'
      });
    }
    
    // POST /api/materials
    if (req.method === 'POST') {
      // PRODUCTION NOTE: Replace with database insertion - e.g., INSERT INTO materials
      return res.status(201).json({
        id: 999,
        ...req.body,
        created_at: new Date().toISOString()
      });
    }
    
    // Other methods
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Materials API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 