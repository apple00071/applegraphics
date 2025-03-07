import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
// Import NotificationService if needed later
// import NotificationService from './services/notificationService';
import { createClient } from '@supabase/supabase-js';
import { formatINR, formatDateToIST, getCurrentDateTimeIST } from './utils/formatters.js';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';

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
app.use(express.urlencoded({ extended: true }));

// For development, log requests
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Create HTTP server for socket.io
const server = http.createServer(app);

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

// Initialize socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL || 'http://localhost:3000'
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Fallback data for development/demo when Supabase is not available
const fallbackData = {
  materials: [
    { id: 1, name: 'Paper A4', current_stock: 15, reorder_level: 20, unit_of_measure: 'Reams', unit_price: 5.99, category_name: 'Paper', sku: 'PAP-A4-001', transactions: [] },
    { id: 2, name: 'Ink Cartridge Black', current_stock: 2, reorder_level: 5, unit_of_measure: 'Units', unit_price: 29.99, category_name: 'Ink', sku: 'INK-BLK-001', transactions: [] },
    { id: 3, name: 'Binding Covers', current_stock: 30, reorder_level: 50, unit_of_measure: 'Pcs', unit_price: 0.50, category_name: 'Binding', sku: 'BND-COV-001', transactions: [] },
    { id: 4, name: 'Glue Sticks', current_stock: 3, reorder_level: 10, unit_of_measure: 'Pcs', unit_price: 1.99, category_name: 'Adhesives', sku: 'GLE-STK-001', transactions: [] }
  ],
  orders: [
    { id: 1, customer_name: 'Acme Corp', order_date: '2023-05-10', status: 'Pending', total_amount: 1250 },
    { id: 2, customer_name: 'TechStart Inc', order_date: '2023-05-08', status: 'Processing', total_amount: 850 },
    { id: 3, customer_name: 'Global Media', order_date: '2023-05-05', status: 'Completed', total_amount: 1600 }
  ],
  stats: {
    totalMaterials: 25,
    totalEquipment: 15,
    pendingOrders: 3,
    lowStockItems: 4
  },
  users: [
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
  ],
  notifications: []
};

// Function to fetch current data from Supabase
async function fetchDataFromSupabase() {
  try {
    // Fetch materials
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*');
    
    if (materialsError) throw materialsError;
    
    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(10);
    
    if (ordersError) throw ordersError;
    
    // Fetch stats or calculate them
    const { data: materialsCount, error: materialsCountError } = await supabase
      .from('materials')
      .select('count', { count: 'exact', head: true });
    
    if (materialsCountError) throw materialsCountError;
    
    const { data: equipmentCount, error: equipmentCountError } = await supabase
      .from('equipment')
      .select('count', { count: 'exact', head: true });
    
    if (equipmentCountError) throw equipmentCountError;
    
    const { data: pendingOrders, error: pendingOrdersError } = await supabase
      .from('orders')
      .select('count', { count: 'exact', head: true })
      .eq('status', 'Pending');
    
    if (pendingOrdersError) throw pendingOrdersError;
    
    const { data: lowStockItems, error: lowStockError } = await supabase
      .rpc('count_low_stock_items');
    
    if (lowStockError) throw lowStockError;
    
    // Construct the data object
    return {
      materials,
      orders,
      stats: {
        totalMaterials: materialsCount || 0,
        totalEquipment: equipmentCount || 0,
        pendingOrders: pendingOrders || 0,
        lowStockItems: lowStockItems || 0
      }
    };
  } catch (error) {
    console.error('Error fetching data from Supabase:', error);
    return null;
  }
}

// Socket.io connection handler
io.on('connection', async (socket) => {
  console.log('New client connected', socket.id);
  
  // Send current data to newly connected client
  try {
    // Try to get data from Supabase first
    if (supabase) {
      const supabaseData = await fetchDataFromSupabase();
      if (supabaseData) {
        socket.emit('initialData', supabaseData);
      } else {
        // Fall back to demo data
        socket.emit('initialData', fallbackData);
      }
    } else {
      // Use fallback data if Supabase is not available
      socket.emit('initialData', fallbackData);
    }
  } catch (error) {
    console.error('Error sending initial data:', error);
    socket.emit('initialData', fallbackData);
  }
  
  // Handle barcode scan
  socket.on('scanBarcode', async (barcode, callback) => {
    console.log('Barcode scanned:', barcode);
    
    try {
      if (supabase) {
        // Try to find material in Supabase
        const { data: material, error } = await supabase
          .from('materials')
          .select('*')
          .eq('sku', barcode)
          .single();
        
        if (error) throw error;
        
        if (material) {
          callback({ success: true, material });
          return;
        }
      }
      
      // Fall back to demo data if not found in Supabase
      const material = fallbackData.materials.find(m => m.sku === barcode);
      
      if (material) {
        callback({ success: true, material });
      } else {
        callback({ success: false, message: 'Material not found' });
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      callback({ success: false, message: 'Error processing barcode' });
    }
  });
  
  // Handle inventory updates
  socket.on('updateInventory', async (data, callback) => {
    try {
      const { materialId, amount } = data;
      
      if (supabase) {
        // Update in Supabase
        const { data: updatedMaterial, error } = await supabase
          .rpc('update_material_stock', { 
            material_id: materialId, 
            quantity_change: amount 
          });
        
        if (error) throw error;
        
        // Get the updated material
        const { data: material, error: getMaterialError } = await supabase
          .from('materials')
          .select('*')
          .eq('id', materialId)
          .single();
        
        if (getMaterialError) throw getMaterialError;
        
        // Update low stock count
        const { data: lowStockCount, error: lowStockError } = await supabase
          .rpc('count_low_stock_items');
        
        if (lowStockError) throw lowStockError;
        
        // Get updated stats
        const stats = {
          totalMaterials: fallbackData.stats.totalMaterials,
          totalEquipment: fallbackData.stats.totalEquipment,
          pendingOrders: fallbackData.stats.pendingOrders,
          lowStockItems: lowStockCount || 0
        };
        
        // Broadcast update to all clients
        io.emit('inventoryUpdated', {
          material,
          stats
        });
        
        callback({ success: true, material });
        return;
      }
      
      // Fall back to demo data if Supabase is not available
      const materialIndex = fallbackData.materials.findIndex(m => m.id === materialId);
      
      if (materialIndex === -1) {
        callback({ success: false, message: 'Material not found' });
        return;
      }
      
      // Update stock in demo data
      const material = fallbackData.materials[materialIndex];
      const updatedMaterial = {
        ...material,
        current_stock: material.current_stock + amount
      };
      
      // Ensure stock doesn't go below 0
      if (updatedMaterial.current_stock < 0) {
        callback({ success: false, message: 'Insufficient stock' });
        return;
      }
      
      // Update in our data store
      fallbackData.materials[materialIndex] = updatedMaterial;
      
      // Update low stock count in stats
      const lowStockCount = fallbackData.materials.filter(
        m => m.current_stock < m.reorder_level
      ).length;
      
      fallbackData.stats.lowStockItems = lowStockCount;
      
      // Broadcast to all clients that data has changed
      io.emit('inventoryUpdated', {
        material: updatedMaterial,
        stats: fallbackData.stats
      });
      
      callback({ success: true, material: updatedMaterial });
    } catch (error) {
      console.error('Error updating inventory:', error);
      callback({ success: false, message: 'Server error' });
    }
  });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

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

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  // All remaining requests return the React app, so it can handle routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Modified server start to use the http server for socket.io
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 