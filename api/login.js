// Vercel Serverless Function for login
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
    console.log('Login request received:', req.body);
    
    // Extract credentials from request body
    const { username, password, email } = req.body;
    const userIdentifier = username || email;
    
    if (!userIdentifier || !password) {
      return res.status(400).json({ 
        message: 'Username/email and password are required',
        received: Object.keys(req.body)
      });
    }
    
    // Test users - hardcoded for demo purposes
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
    
    // Find matching user by username or email
    const matchedUser = TEST_USERS.find(user => 
      user.username === userIdentifier || 
      user.email === userIdentifier
    );
    
    if (!matchedUser || matchedUser.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate a simple token (in production use JWT or similar)
    const token = Buffer.from(JSON.stringify({
      id: matchedUser.id,
      username: matchedUser.username,
      role: matchedUser.role,
      exp: Date.now() + (8 * 60 * 60 * 1000)  // 8 hours expiry
    })).toString('base64');
    
    console.log('Login successful for:', matchedUser.username);
    
    // Return success response
    return res.status(200).json({
      token,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        email: matchedUser.email
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