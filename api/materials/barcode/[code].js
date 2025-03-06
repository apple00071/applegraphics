// Vercel Serverless Function for material barcode lookup
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
    // Get the barcode code from the request URL
    const code = req.query.code;
    
    if (!code) {
      return res.status(400).json({ message: 'Barcode code is required' });
    }
    
    // PRODUCTION NOTE: In a real application, you would query your database
    // For now, we return a sample material for demo purposes
    if (code.startsWith('AG-')) {
      // Sample material for testing
      return res.status(200).json({
        id: 999,
        name: 'Sample Barcode Item',
        sku: code,
        current_stock: 100,
        unit_of_measure: 'units',
        unit_price: 10.00,
        category_name: 'Sample Category'
      });
    }
    
    // If barcode not found
    return res.status(404).json({ message: 'Material not found' });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 