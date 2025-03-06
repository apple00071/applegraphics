// Sample orders data
const sampleOrders = [
  { id: 101, customer_name: 'ABC Corp', order_date: '2023-09-15', required_date: '2023-09-30', status: 'in-progress', total_amount: 1250.00 },
  { id: 102, customer_name: 'XYZ Publishing', order_date: '2023-09-14', required_date: '2023-09-28', status: 'pending', total_amount: 845.50 },
  { id: 103, customer_name: 'Local Magazine', order_date: '2023-09-12', required_date: '2023-09-20', status: 'completed', total_amount: 2340.75 },
  { id: 104, customer_name: 'City Newspaper', order_date: '2023-09-10', required_date: '2023-09-15', status: 'completed', total_amount: 1765.25 },
  { id: 105, customer_name: 'Business Cards Inc', order_date: '2023-09-08', required_date: '2023-09-18', status: 'cancelled', total_amount: 350.00 },
];

// Sample order details
const orderDetails = {
  101: {
    id: 101,
    customer_name: 'ABC Corp',
    customer_contact: 'John Smith',
    customer_email: 'john@abccorp.com',
    order_date: '2023-09-15',
    required_date: '2023-09-30',
    status: 'in-progress',
    total_amount: 1250.00,
    notes: 'Priority customer, handle with care',
    items: [
      { id: 1, material_name: 'Matte Paper A4', quantity: 2000, unit_price: 0.05, unit_of_measure: 'sheets', total_price: 100.00 },
      { id: 2, material_name: 'Black Ink', quantity: 3, unit_price: 25.00, unit_of_measure: 'liters', total_price: 75.00 },
      { id: 3, material_name: 'Cyan Ink', quantity: 2, unit_price: 30.00, unit_of_measure: 'liters', total_price: 60.00 },
      { id: 4, material_name: 'Binding Wire', quantity: 5, unit_price: 15.00, unit_of_measure: 'rolls', total_price: 75.00 }
    ],
    production_jobs: [
      { id: 201, job_name: 'Business Catalog Printing', status: 'in-progress', start_date: '2023-09-16', due_date: '2023-09-25', completion_date: null },
      { id: 202, job_name: 'Catalog Binding', status: 'pending', start_date: '2023-09-25', due_date: '2023-09-28', completion_date: null }
    ]
  }
};

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

  // GET /api/orders
  if (req.method === 'GET' && !req.query.id) {
    return res.status(200).json(sampleOrders);
  }
  
  // GET /api/orders/:id
  if (req.method === 'GET' && req.query.id) {
    const orderId = parseInt(req.query.id);
    const orderDetail = orderDetails[orderId];
    
    if (!orderDetail) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    return res.status(200).json(orderDetail);
  }
  
  // POST /api/orders
  if (req.method === 'POST') {
    const newOrder = {
      id: 106,
      ...req.body,
      order_date: new Date().toISOString().split('T')[0]
    };
    
    return res.status(201).json(newOrder);
  }
  
  // Other methods
  return res.status(405).json({ message: 'Method not allowed' });
} 