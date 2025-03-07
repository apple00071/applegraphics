// Vercel Serverless Function for material barcode lookup
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

export default async function handler(req, res) {
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
    return res.status(401).json({ 
      message: 'Unauthorized - Please log in again',
      details: 'Missing or invalid authorization header'
    });
  }

  try {
    // Get the barcode code from the request URL
    const code = req.query.code;
    
    if (!code) {
      return res.status(400).json({ 
        message: 'Invalid barcode',
        details: 'No barcode code provided in the request'
      });
    }

    // Verify Supabase connection
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({
        message: 'Server configuration error',
        details: 'Database connection not properly configured'
      });
    }
    
    // Query Supabase for the material using parameterized query
    const { data: material, error } = await supabase
      .from('materials')
      .select(`
        *,
        material_categories(name)
      `)
      .or('sku.eq.{code},sku.eq.AG-{code}'.replace(/{code}/g, code))
      .single();

    if (error) {
      return res.status(500).json({ 
        message: 'Database error',
        details: error.message,
        code: error.code
      });
    }

    if (!material) {
      return res.status(404).json({ 
        message: 'Material not found',
        details: `No material found with barcode: ${code}`
      });
    }
    
    // Format the response
    const response = {
      id: material.id,
      name: material.name,
      sku: material.sku,
      current_stock: material.current_stock,
      unit_of_measure: material.unit_of_measure,
      unit_price: material.unit_price,
      category_name: material.material_categories?.name || 'Uncategorized'
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    return res.status(500).json({ 
      message: 'Server error',
      details: error.message,
      type: error.name || 'UnknownError'
    });
  }
} 