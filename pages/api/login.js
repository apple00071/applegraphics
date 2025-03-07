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

// Simplified login handler for test accounts
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
    console.log('Login request body:', req.body);
    
    const { username, password, email } = req.body;
    
    // Extract email if only username is provided
    const userEmail = email || (username ? `${username}@printpress.com` : null);
    // Extract username if only email is provided
    const userName = username || (email ? email.split('@')[0] : null);
    
    console.log('Login attempt with:', { userName, userEmail, passwordProvided: !!password });
    
    // Hardcoded test users - using direct comparison for simplicity
    const VALID_CREDENTIALS = [
      { username: 'admin', email: 'admin@printpress.com', password: 'admin123', role: 'admin' },
      { username: 'user', email: 'user@printpress.com', password: 'user123', role: 'user' }
    ];
    
    // Check for valid credentials
    const matchedUser = VALID_CREDENTIALS.find(user => 
      (user.username === userName || user.email === userEmail) && 
      user.password === password
    );
    
    if (!matchedUser) {
      console.log('Invalid credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('Login successful for:', matchedUser.username);
    
    // Generate a simple token
    const token = Buffer.from(JSON.stringify({
      id: matchedUser.username,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      exp: Date.now() + (8 * 60 * 60 * 1000) // 8 hours expiry
    })).toString('base64');
    
    return res.status(200).json({
      token,
      user: {
        id: matchedUser.username,
        username: matchedUser.username,
        role: matchedUser.role,
        email: matchedUser.email
      }
    });
    
  } catch (error) {
    console.error('Login endpoint error:', error);
    return res.status(500).json({ message: 'Server error', error: error.toString() });
  }
} 