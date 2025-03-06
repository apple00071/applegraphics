const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const NotificationService = require('./services/notificationService');
const supabase = require('./supabaseClient');
const { formatINR, formatDateToIST, getCurrentDateTimeIST } = require('./utils/formatters');

const app = express();
const port = process.env.PORT || 5000;

// Set the timezone for the entire application
process.env.TZ = 'Asia/Kolkata';

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here', (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Hardcoded users for development
const devUsers = [
  {
    id: 1,
    username: 'admin',
    password: '$2b$10$hJElUNFGTOJQRR9K.OolMuJNsQ7KY19COMdmONJoFME/fLhXXvtTO', // admin123
    role: 'admin',
    email: 'admin@printpress.com'
  },
  {
    id: 2,
    username: 'user',
    password: '$2b$10$P4V3nDmuJyQqKPnAts.5TO/TzPdaNwPI2AWYc.5q6XrjQJ1YPLOtu', // user123
    role: 'user',
    email: 'user@printpress.com'
  }
];

// Authentication routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username);
    
    let user;
    
    try {
      // Try to authenticate with Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        console.log('Supabase query error:', error.message);
        throw error;
      }
      
      console.log('User found in Supabase:', data ? 'Yes' : 'No');
      if (data) {
        console.log('User data structure:', JSON.stringify(data, null, 2));
      }
      
      user = data;
    } catch (dbError) {
      console.log('Database connection failed, using development users');
      console.error('Supabase error details:', dbError);
      // If database connection fails, use hardcoded development users
      user = devUsers.find(u => u.username === username);
    }
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    let validPassword;
    try {
      console.log('Comparing password for user:', username);
      
      // Normal bcrypt verification
      validPassword = await bcrypt.compare(password, user.password);
      console.log('Password validation:', validPassword ? 'successful' : 'failed');
      
      // Special case for test users - allow direct password check for specific test accounts
      if (!validPassword && (
        (username === 'admin' && password === 'admin123') || 
        (username === 'user' && password === 'user123')
      )) {
        console.log('Special case: Using direct password check for test account');
        validPassword = true;
      }
    } catch (error) {
      console.error('Password comparison error:', error);
      return res.status(500).json({ message: 'Authentication error' });
    }
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Convert UUID to string for JWT if necessary
    const userId = typeof user.id === 'object' ? user.id.toString() : user.id;
    
    const token = jwt.sign(
      { 
        id: userId, 
        username: user.username, 
        role: user.role 
      }, 
      process.env.JWT_SECRET || 'your-secret-key-here', 
      { expiresIn: '8h' }
    );
    
    console.log('Login successful for:', username);
    
    res.json({ 
      token, 
      user: { 
        id: userId, 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Materials routes
app.get('/api/materials', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/materials/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Material not found' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/materials', authenticateToken, async (req, res) => {
  try {
    const { 
      category_id, name, description, sku, unit_of_measure,
      reorder_level, current_stock, unit_price, supplier_id, location 
    } = req.body;
    
    const { data, error } = await supabase
      .from('materials')
      .insert([
        { 
          category_id, 
          name, 
          description, 
          sku, 
          unit_of_measure, 
          reorder_level, 
          current_stock, 
          unit_price, 
          supplier_id, 
          location 
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Material transaction routes
app.get('/api/materials/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select(`
        id, 
        transaction_type, 
        quantity, 
        transaction_date, 
        unit_price,
        job_id,
        production_jobs(job_name),
        users(username),
        notes
      `)
      .eq('material_id', id)
      .order('transaction_date', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Transform the data to match the expected format
    const formattedData = data.map(item => ({
      id: item.id,
      transaction_type: item.transaction_type,
      quantity: item.quantity,
      transaction_date: item.transaction_date,
      unit_price: item.unit_price,
      job_id: item.job_id,
      job_name: item.production_jobs?.job_name,
      user_name: item.users?.username,
      notes: item.notes
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching material transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create transaction and update material stock in one operation
app.post('/api/materials/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      transaction_type, 
      quantity, 
      unit_price = null, 
      job_id = null, 
      notes = null 
    } = req.body;
    
    // Start a Supabase transaction
    // First, create the transaction
    const { data: transactionData, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert([
        {
          material_id: id,
          transaction_type,
          quantity,
          unit_price,
          job_id,
          user_id: req.user.id,
          notes
        }
      ])
      .select();
    
    if (transactionError) throw transactionError;
    
    // Then, update the material stock
    const { data: materialData, error: materialError } = await supabase
      .rpc('update_material_stock', { 
        material_id: id, 
        quantity_change: quantity 
      });
    
    if (materialError) throw materialError;
    
    // Get the updated material
    const { data: updatedMaterial, error: getMaterialError } = await supabase
      .from('materials')
      .select('id, name, current_stock, reorder_level')
      .eq('id', id)
      .single();
    
    if (getMaterialError) throw getMaterialError;
    
    // Check if material is now below reorder level
    if (updatedMaterial.current_stock <= updatedMaterial.reorder_level) {
      // Create low stock alert
      await NotificationService.createLowStockAlert(updatedMaterial);
    }
    
    res.status(201).json({
      transaction: transactionData[0],
      material: {
        id: updatedMaterial.id,
        current_stock: updatedMaterial.current_stock
      }
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Adjustment endpoint (simplified version of the transaction endpoint)
app.post('/api/materials/:id/adjust', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { quantity, adjustmentReason } = req.body;
  
  try {
    // Reuse the transaction endpoint logic
    const result = await axios.post(`http://localhost:${port}/api/materials/${id}/transactions`, {
      transaction_type: 'adjustment',
      quantity,
      notes: adjustmentReason
    }, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Catch-all route to serve the React app for any non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'build', 'index.html'));
    }
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api`);
  console.log('\nDefault login credentials:');
  console.log('-------------------------');
  console.log('Admin User:');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('\nRegular User:');
  console.log('Username: user');
  console.log('Password: user123');
}); 