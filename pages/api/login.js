// Vercel Serverless Function for login
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://qlkxukzmtkkxarcqzysn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsa3h1a3ptdGtreGFyY3F6eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNTkzODcsImV4cCI6MjA1NjgzNTM4N30.60ab2zNHSUkm23RR_NUo9-yDlUo3lcqOUnIF4M-0K0o';
const jwtSecret = process.env.JWT_SECRET || 'a8f62e9b47d3c5f1e08a7b6d92c4e5f3a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase URL:", supabaseUrl);
console.log("JWT Secret available:", !!jwtSecret);

// Hardcoded users for testing/development
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

  // Only allow POST for login
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("Login request body:", req.body);
    
    const { username, password, email } = req.body;
    const loginIdentifier = email || username;
    
    console.log('Login attempt for:', loginIdentifier);
    
    // SPECIAL CASE: Direct check for test accounts
    const testUser = TEST_USERS.find(
      u => (email && u.email === email) || 
           (username && u.username === username) ||
           (email && u.username === email.split('@')[0])
    );
    
    if (testUser && (password === testUser.password || password === 'admin123' || password === 'user123')) {
      console.log('Test user login successful for:', testUser.username);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: testUser.id, 
          username: testUser.username,
          email: testUser.email,
          role: testUser.role 
        },
        jwtSecret,
        { expiresIn: '8h' }
      );
      
      return res.status(200).json({
        token,
        user: {
          id: testUser.id,
          username: testUser.username,
          role: testUser.role,
          email: testUser.email
        }
      });
    }
    
    // If not a test user, try regular authentication via Supabase
    let user;
    try {
      // Try by username
      if (username) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();
        
        if (!error && data) {
          user = data;
        }
      }
      
      // If not found and email is provided, try by email
      if (!user && email) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
          
        if (!error && data) {
          user = data;
        }
        
        // Also try with username extracted from email
        if (!user) {
          const extractedUsername = email.split('@')[0];
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', extractedUsername)
            .single();
            
          if (!error && data) {
            user = data;
          }
        }
      }
    } catch (error) {
      console.error('Supabase query error:', error);
    }
    
    if (!user) {
      console.log('User not found for identifier:', loginIdentifier);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    let validPassword = false;
    try {
      // Try normal bcrypt verification if password hash available
      if (user.password && user.password.startsWith('$2')) {
        validPassword = await bcrypt.compare(password, user.password);
      }
      
      // Special handling for test accounts and direct password matching
      if (!validPassword && 
          ((user.username === 'admin' && password === 'admin123') || 
           (user.username === 'user' && password === 'user123'))) {
        validPassword = true;
      }
    } catch (error) {
      console.error('Password verification error:', error);
    }
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '8h' }
    );
    
    console.log('Login successful for user:', user.username);
    
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Login endpoint error:', error);
    return res.status(500).json({ message: 'Server error', error: error.toString() });
  }
} 