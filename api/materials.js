// Real Supabase interaction for materials
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './middleware/auth.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
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

  // Authorization check using middleware
  const user = verifyAuth(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // GET /api/materials - List all materials
    if (req.method === 'GET' && !req.query.id) {
      const { data: materials, error } = await supabase
        .from('materials')
        .select(`
          *,
          material_categories(name)
        `)
        .order('name');

      if (error) throw error;
      return res.status(200).json(materials || []);
    }

    // GET /api/materials/:id - Get single material
    if (req.method === 'GET' && req.query.id) {
      const { data: material, error } = await supabase
        .from('materials')
        .select(`
          *,
          material_categories(name)
        `)
        .eq('id', req.query.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ message: 'Material not found' });
        throw error;
      }
      return res.status(200).json(material);
    }

    // POST /api/materials - Create new material
    if (req.method === 'POST') {
      const { error, data } = await supabase
        .from('materials')
        .insert([req.body])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    // PATCH /api/materials/:id - Update material
    if (req.method === 'PATCH' && req.query.id) {
      const { error, data } = await supabase
        .from('materials')
        .update(req.body)
        .eq('id', req.query.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // DELETE /api/materials/:id - Delete material
    if (req.method === 'DELETE' && req.query.id) {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', req.query.id);

      if (error) throw error;
      return res.status(200).json({ message: 'Material deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Materials API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
