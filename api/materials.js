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
      // In production, return empty array
      return res.status(200).json([]);
    }
    
    // GET /api/materials/:id
    if (req.method === 'GET' && req.query.id) {
      // PRODUCTION NOTE: Replace with database query - e.g., SELECT * FROM materials WHERE id = ?
      // In production, return 404 as we don't have real data
      return res.status(404).json({ message: 'Material not found' });
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