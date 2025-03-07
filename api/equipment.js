// Vercel Serverless Function for equipment management
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
    // GET /api/equipment - List all equipment
    if (req.method === 'GET' && !req.query.id) {
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select(`
          *,
          maintenance_logs (
            id,
            maintenance_date,
            maintenance_type,
            notes
          )
        `)
        .order('name');

      if (error) throw error;
      return res.status(200).json(equipment);
    }
    
    // GET /api/equipment/:id - Get single equipment
    if (req.method === 'GET' && req.query.id) {
      const { data: equipment, error } = await supabase
        .from('equipment')
        .select(`
          *,
          maintenance_logs (
            *
          ),
          production_jobs (
            id,
            start_date,
            end_date,
            status
          )
        `)
        .eq('id', req.query.id)
        .single();

      if (error) throw error;
      if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
      return res.status(200).json(equipment);
    }
    
    // POST /api/equipment - Create new equipment
    if (req.method === 'POST') {
      const equipmentData = req.body;
      
      const { data: equipment, error } = await supabase
        .from('equipment')
        .insert([{
          name: equipmentData.name,
          type: equipmentData.type,
          model: equipmentData.model,
          manufacturer: equipmentData.manufacturer,
          purchase_date: equipmentData.purchase_date,
          last_maintenance_date: equipmentData.last_maintenance_date,
          next_maintenance_date: equipmentData.next_maintenance_date,
          status: equipmentData.status || 'available',
          notes: equipmentData.notes
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(equipment);
    }
    
    // PUT /api/equipment/:id - Update equipment
    if (req.method === 'PUT' && req.query.id) {
      const { data: equipment, error } = await supabase
        .from('equipment')
        .update(req.body)
        .eq('id', req.query.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(equipment);
    }
    
    // POST /api/equipment/:id/maintenance - Add maintenance log
    if (req.method === 'POST' && req.query.id && req.query.action === 'maintenance') {
      const maintenanceData = req.body;
      
      // Create maintenance log
      const { data: maintenanceLog, error: logError } = await supabase
        .from('maintenance_logs')
        .insert([{
          equipment_id: req.query.id,
          maintenance_date: maintenanceData.maintenance_date || new Date().toISOString(),
          maintenance_type: maintenanceData.maintenance_type,
          technician: maintenanceData.technician,
          cost: maintenanceData.cost,
          notes: maintenanceData.notes
        }])
        .select()
        .single();

      if (logError) throw logError;

      // Update equipment's last and next maintenance dates
      const { error: updateError } = await supabase
        .from('equipment')
        .update({
          last_maintenance_date: maintenanceData.maintenance_date || new Date().toISOString(),
          next_maintenance_date: maintenanceData.next_maintenance_date
        })
        .eq('id', req.query.id);

      if (updateError) throw updateError;

      return res.status(201).json(maintenanceLog);
    }
    
    // DELETE /api/equipment/:id - Delete equipment
    if (req.method === 'DELETE' && req.query.id) {
      // Check if equipment is being used in any active jobs
      const { data: activeJobs, error: jobsError } = await supabase
        .from('production_jobs')
        .select('id')
        .eq('equipment_id', req.query.id)
        .eq('status', 'in_progress')
        .limit(1);

      if (jobsError) throw jobsError;

      if (activeJobs && activeJobs.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete equipment that is being used in active production jobs' 
        });
      }

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', req.query.id);

      if (error) throw error;
      return res.status(200).json({ message: 'Equipment deleted successfully' });
    }
    
    // Other methods
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Equipment API error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 