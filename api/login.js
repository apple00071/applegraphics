// Real authentication using Supabase and bcryptjs (ES Module)
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Standard Vercel serverless function format
export default async function handler(req, res) {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get credentials
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 1. Fetch user by email OR username
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq."${email}",username.eq."${email}"`)
      .limit(1);

    if (fetchError) {
      console.error('Database error during login:', fetchError);
      return res.status(500).json({ message: 'Database error', details: fetchError.message });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userRecord = users[0];

    // 2. Verify Password
    const passwordMatch = await bcrypt.compare(password, userRecord.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Create Session Token (matches frontend logic)
    const tokenData = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      role: userRecord.role,
      exp: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    // Return success with complete user data
    return res.status(200).json({
      token,
      user: {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        role: userRecord.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error',
      details: error.message
    });
  }
}