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
      // For demo purposes, return minimal sample data
      return res.status(200).json([
        { id: 101, customer_name: 'ABC Corp', order_date: '2023-09-15', required_date: '2023-09-30', status: 'in-progress', total_amount: 1250.00 },
        { id: 102, customer_name: 'XYZ Publishing', order_date: '2023-09-14', required_date: '2023-09-28', status: 'pending', total_amount: 845.50 }
      ]);
    }
    
    // GET /api/orders/:id
    if (req.method === 'GET' && req.query.id) {
      // PRODUCTION NOTE: Replace with database query - e.g., SELECT * FROM orders WHERE id = ?
      // For demo purposes, return minimal sample data
      return res.status(200).json({
        id: parseInt(req.query.id),
        customer_name: 'Sample Customer',
        customer_contact: 'Contact Person',
        customer_email: 'contact@example.com',
        order_date: '2023-09-15',
        required_date: '2023-09-30',
        status: 'in-progress',
        total_amount: 1250.00,
        notes: 'Sample order notes',
        items: [
          { id: 1, material_name: 'Sample Material', quantity: 10, unit_price: 5.00, unit_of_measure: 'units', total_price: 50.00 }
        ],
        production_jobs: [
          { id: 201, job_name: 'Sample Job', status: 'in-progress', start_date: '2023-09-16', due_date: '2023-09-25', completion_date: null }
        ]
      });
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