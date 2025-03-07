// Vercel Serverless Function for inventory transactions
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
    // Only handle POST for transactions
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }
    
    // Get transaction data from request body
    const { material_id, transaction_type, quantity, notes, job_id, user_id } = req.body;
    
    if (!material_id || !transaction_type || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate transaction type
    const validTypes = ['stock_in', 'stock_out', 'adjustment', 'usage'];
    if (!validTypes.includes(transaction_type)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Start a Supabase transaction
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('current_stock, unit_price')
      .eq('id', material_id)
      .single();

    if (materialError) {
      throw materialError;
    }

    // Calculate new stock level
    let newStock = material.current_stock;
    if (transaction_type === 'stock_in' || transaction_type === 'adjustment') {
      newStock += parseFloat(quantity);
    } else if (transaction_type === 'stock_out' || transaction_type === 'usage') {
      newStock -= parseFloat(quantity);
    }

    // Update material stock
    const { error: updateError } = await supabase
      .from('materials')
      .update({ current_stock: newStock })
      .eq('id', material_id);

    if (updateError) {
      throw updateError;
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert([{
        material_id,
        transaction_type,
        quantity,
        unit_price: material.unit_price,
        transaction_date: new Date().toISOString(),
        job_id,
        user_id,
        notes
      }])
      .select()
      .single();

    if (transactionError) {
      throw transactionError;
    }

    // Check if stock is below reorder level and create notification if needed
    const { data: materialDetails, error: detailsError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', material_id)
      .single();

    if (!detailsError && materialDetails.current_stock <= materialDetails.reorder_level) {
      // Create low stock notification
      await supabase
        .from('notifications')
        .insert([{
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `Material "${materialDetails.name}" is below reorder level. Current stock: ${materialDetails.current_stock} ${materialDetails.unit_of_measure}, Reorder level: ${materialDetails.reorder_level} ${materialDetails.unit_of_measure}.`,
          is_read: false
        }]);
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction recorded successfully',
      transaction,
      current_stock: newStock
    });
  } catch (error) {
    console.error('Inventory transaction error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 