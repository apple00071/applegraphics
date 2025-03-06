// Sample materials data
const sampleMaterials = [
  { id: 1, name: 'Matte Paper A4', current_stock: 500, unit_of_measure: 'sheets', reorder_level: 100, unit_price: 0.05, category_id: 1, category_name: 'Paper', sku: 'AG-PAP-MATTE-001' },
  { id: 2, name: 'Glossy Paper A3', current_stock: 250, unit_of_measure: 'sheets', reorder_level: 50, unit_price: 0.12, category_id: 1, category_name: 'Paper', sku: 'AG-PAP-GLOSS-002' },
  { id: 3, name: 'Black Ink', current_stock: 20, unit_of_measure: 'liters', reorder_level: 5, unit_price: 25.00, category_id: 2, category_name: 'Ink', sku: 'AG-INK-BLACK-003' },
  { id: 4, name: 'Cyan Ink', current_stock: 15, unit_of_measure: 'liters', reorder_level: 5, unit_price: 30.00, category_id: 2, category_name: 'Ink', sku: 'AG-INK-CYAN-004' },
  { id: 5, name: 'Magenta Ink', current_stock: 18, unit_of_measure: 'liters', reorder_level: 5, unit_price: 30.00, category_id: 2, category_name: 'Ink', sku: 'AG-INK-MAGEN-005' },
  { id: 6, name: 'Yellow Ink', current_stock: 22, unit_of_measure: 'liters', reorder_level: 5, unit_price: 28.00, category_id: 2, category_name: 'Ink', sku: 'AG-INK-YELLO-006' },
  { id: 7, name: 'Binding Wire', current_stock: 30, unit_of_measure: 'rolls', reorder_level: 10, unit_price: 15.00, category_id: 3, category_name: 'Binding', sku: 'AG-BIN-WIRE-007' },
  { id: 8, name: 'Offset Plates', current_stock: 40, unit_of_measure: 'pieces', reorder_level: 15, unit_price: 8.00, category_id: 4, category_name: 'Plates', sku: 'AG-PLA-OFFSE-008' }
];

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

  // GET /api/materials
  if (req.method === 'GET' && !req.query.id) {
    return res.status(200).json(sampleMaterials);
  }
  
  // GET /api/materials/:id
  if (req.method === 'GET' && req.query.id) {
    const material = sampleMaterials.find(m => m.id === parseInt(req.query.id));
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    return res.status(200).json(material);
  }
  
  // POST /api/materials
  if (req.method === 'POST') {
    const newMaterial = {
      id: sampleMaterials.length + 1,
      ...req.body
    };
    
    return res.status(201).json(newMaterial);
  }
  
  // Other methods
  return res.status(405).json({ message: 'Method not allowed' });
} 