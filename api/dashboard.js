// Vercel Serverless Function for dashboard statistics
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
    // Only allow GET for dashboard stats
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get current date and date 30 days ago for trends
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get low stock materials count
    const { data: lowStockMaterials, error: materialsError } = await supabase
      .from('materials')
      .select('id')
      .lte('current_stock', supabase.raw('reorder_level'));

    if (materialsError) throw materialsError;

    // Get pending orders count
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending');

    if (ordersError) throw ordersError;

    // Get equipment requiring maintenance
    const { data: maintenanceNeeded, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .lte('next_maintenance_date', now.toISOString());

    if (equipmentError) throw equipmentError;

    // Get recent transactions
    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        materials (
          name,
          unit_of_measure
        )
      `)
      .gte('transaction_date', thirtyDaysAgo.toISOString())
      .order('transaction_date', { ascending: false })
      .limit(10);

    if (transactionsError) throw transactionsError;

    // Get monthly transaction trends
    const { data: monthlyTrends, error: trendsError } = await supabase
      .from('inventory_transactions')
      .select('transaction_type, quantity')
      .gte('transaction_date', thirtyDaysAgo.toISOString());

    if (trendsError) throw trendsError;

    // Calculate monthly trends
    const trends = {
      stock_in: monthlyTrends.filter(t => t.transaction_type === 'stock_in')
        .reduce((sum, t) => sum + parseFloat(t.quantity), 0),
      stock_out: monthlyTrends.filter(t => t.transaction_type === 'stock_out')
        .reduce((sum, t) => sum + parseFloat(t.quantity), 0),
      usage: monthlyTrends.filter(t => t.transaction_type === 'usage')
        .reduce((sum, t) => sum + parseFloat(t.quantity), 0)
    };

    // Get unread notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notificationsError) throw notificationsError;

    // Return dashboard statistics
    return res.status(200).json({
      alerts: {
        low_stock_count: lowStockMaterials?.length || 0,
        pending_orders_count: pendingOrders?.length || 0,
        maintenance_needed_count: maintenanceNeeded?.length || 0,
        unread_notifications_count: notifications?.length || 0
      },
      recent_transactions: recentTransactions || [],
      monthly_trends: trends,
      notifications: notifications || [],
      last_updated: now.toISOString()
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 