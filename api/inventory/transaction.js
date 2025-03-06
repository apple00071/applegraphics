// Vercel Serverless Function for inventory transactions
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
    // Only handle POST for transactions
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }
    
    // Get transaction data from request body
    const { material_id, transaction_type, quantity } = req.body;
    
    if (!material_id || !transaction_type || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate transaction type
    const validTypes = ['stock_in', 'stock_out', 'adjustment', 'usage'];
    if (!validTypes.includes(transaction_type)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }
    
    // PRODUCTION NOTE: In a real application, you would:
    // 1. Update the material's stock in the database
    // 2. Create a transaction record
    // 3. Return the updated material
    
    // For demo purposes, just return success
    return res.status(200).json({
      success: true,
      message: 'Transaction recorded successfully',
      transaction: {
        id: Date.now(),
        material_id,
        transaction_type,
        quantity,
        transaction_date: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Inventory transaction error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 