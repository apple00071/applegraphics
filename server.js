import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import NotificationService from './services/notificationService';
import { createClient } from '@supabase/supabase-js';
import { formatINR, formatDateToIST, getCurrentDateTimeIST } from './utils/formatters';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Set the timezone for the entire application
process.env.TZ = 'Asia/Kolkata';

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow requests from any origin in production
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
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

// Initialize Supabase client
let supabase;
try {
  // Default test values for development - ONLY USE IN DEV, NEVER IN PRODUCTION
  const supabaseUrl = process.env.SUPABASE_URL || 'https://qlkxukzmtkkxarcqzysn.supabase.co';
  const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsa3h1a3ptdGtreGFyY3F6eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNTkzODcsImV4cCI6MjA1NjgzNTM4N30.60ab2zNHSUkm23RR_NUo9-yDlUo3lcqOUnIF4M-0K0o';
  
  console.log('Supabase URL available:', !!supabaseUrl);
  console.log('Supabase KEY available:', !!supabaseKey && supabaseKey.length > 10);
  
  supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test the connection
  supabase.from('users').select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
      if (error) throw error;
      console.log('Supabase connection successful. User count:', count);
    })
    .catch(error => {
      console.warn('Supabase test query failed:', error.message);
      console.log('Will fall back to development data when needed');
    });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  console.log('API will fall back to development data');
}

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
    console.log('Login request received:', req.body ? Object.keys(req.body).join(', ') : 'no body');
    
    // Extract credentials - handle both username and email fields
    const { username, password, email } = req.body;
    
    // Log the auth attempt (securely - not logging passwords)
    console.log('Auth attempt with credentials:', { 
      username: username || '(not provided)', 
      email: email || '(not provided)', 
      hasPassword: Boolean(password) 
    });
    
    // Determine identifier (email or username)
    const userIdentifier = username || email;
    
    if (!userIdentifier) {
      return res.status(400).json({ 
        message: 'Username or email is required',
        received: Object.keys(req.body)
      });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // HARDCODED TEST ACCOUNTS - for testing convenience
    // In a real app, you would NEVER do this - these should be in a database
    const TEST_USERS = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@printpress.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        id: '2',
        username: 'user',
        email: 'user@printpress.com',
        password: 'user123',
        role: 'user'
      }
    ];
    
    // Try known test accounts first for convenience
    const testUser = TEST_USERS.find(u => 
      u.username === userIdentifier || 
      u.email === userIdentifier
    );
    
    if (testUser && testUser.password === password) {
      console.log('Test user login successful:', testUser.username);
      
      const token = jwt.sign(
        { 
          id: testUser.id, 
          username: testUser.username, 
          role: testUser.role 
        }, 
        process.env.JWT_SECRET || 'your-secret-key-here', 
        { expiresIn: '8h' }
      );
      
      return res.json({ 
        token, 
        user: { 
          id: testUser.id, 
          username: testUser.username, 
          email: testUser.email,
          role: testUser.role 
        } 
      });
    }
    
    // Not a test user, try database
    let dbUser;
    if (supabase) {
      try {
        // Try database authentication with Supabase
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`username.eq.${userIdentifier},email.eq.${userIdentifier}`)
          .single();
        
        if (error) {
          console.log('Supabase query error:', error.message);
        } else if (data) {
          console.log('User found in database');
          dbUser = data;
        }
      } catch (dbError) {
        console.error('Database error during login:', dbError);
      }
    }
    
    // If found in database
    if (dbUser) {
      let validPassword = false;
      
      // Check password - depends on how it's stored
      if (dbUser.password.startsWith('$2')) {
        // Bcrypt hashed
        validPassword = await bcrypt.compare(password, dbUser.password);
      } else {
        // Direct comparison (not recommended for production)
        validPassword = dbUser.password === password;
      }
      
      if (validPassword) {
        console.log('Database user login successful');
        
        const token = jwt.sign(
          { 
            id: dbUser.id, 
            username: dbUser.username, 
            role: dbUser.role 
          }, 
          process.env.JWT_SECRET || 'your-secret-key-here', 
          { expiresIn: '8h' }
        );
        
        return res.json({ 
          token, 
          user: { 
            id: dbUser.id, 
            username: dbUser.username, 
            role: dbUser.role,
            email: dbUser.email
          } 
        });
      }
    }
    
    // If we got here, authentication failed
    console.log('Authentication failed for:', userIdentifier);
    return res.status(401).json({ message: 'Invalid credentials' });
    
  } catch (error) {
    console.error('Login endpoint error:', error);
    // Ensure we always return JSON even for errors
    return res.status(500).json({ 
      message: 'Server error during login',
      details: error.message
    });
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

// Global error handler - ADD THIS AT THE END OF THE FILE, before app.listen
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  
  // Always return JSON for API routes
  if (req.path.startsWith('/api')) {
    return res.status(500).json({
      message: 'Internal server error',
      details: err.message || 'Unknown error',
      path: req.path
    });
  }
  
  // For non-API routes, forward to next error handler
  next(err);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\nDefault login credentials:');
  console.log('-------------------------');
  console.log('Admin User:');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('\nRegular User:');
  console.log('Username: user');
  console.log('Password: user123');
}); 