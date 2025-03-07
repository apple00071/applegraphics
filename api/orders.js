// Vercel Serverless Function for orders
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
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // GET /api/orders - List all orders
    if (req.method === 'GET' && !req.query.id) {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            name,
            contact_person,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(orders);
    }
    
    // GET /api/orders/:id - Get single order
    if (req.method === 'GET' && req.query.id) {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            name,
            contact_person,
            email,
            phone,
            address
          ),
          production_jobs (
            *
          )
        `)
        .eq('id', req.query.id)
        .single();

      if (error) throw error;
      if (!order) return res.status(404).json({ message: 'Order not found' });
      return res.status(200).json(order);
    }
    
    // POST /api/orders - Create new order
    if (req.method === 'POST') {
      const orderData = req.body;
      
      // Start a Supabase transaction
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: orderData.customer_id,
          order_date: new Date().toISOString(),
          required_date: orderData.required_date,
          status: 'pending',
          total_amount: orderData.total_amount,
          notes: orderData.notes
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // If there are production jobs, create them
      if (orderData.production_jobs && orderData.production_jobs.length > 0) {
        const { error: jobsError } = await supabase
          .from('production_jobs')
          .insert(
            orderData.production_jobs.map(job => ({
              ...job,
              order_id: order.id
            }))
          );

        if (jobsError) throw jobsError;
      }

      return res.status(201).json(order);
    }
    
    // PUT /api/orders/:id - Update order
    if (req.method === 'PUT' && req.query.id) {
      const { data: order, error } = await supabase
        .from('orders')
        .update(req.body)
        .eq('id', req.query.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(order);
    }
    
    // DELETE /api/orders/:id - Delete order
    if (req.method === 'DELETE' && req.query.id) {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', req.query.id);

      if (error) throw error;
      return res.status(200).json({ message: 'Order deleted successfully' });
    }
    
    // Other methods
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 