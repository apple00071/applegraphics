// Simplified login handler
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
    
    console.log('Login attempt with email:', email);
    
    // Demo accounts
    if ((email === 'admin@printpress.com' && password === 'admin123') ||
        (email === 'user@printpress.com' && password === 'user123')) {
      
      // Create user object
      const user = {
        id: email === 'admin@printpress.com' ? '1' : '2',
        username: email === 'admin@printpress.com' ? 'admin' : 'user',
        email: email,
        role: email === 'admin@printpress.com' ? 'admin' : 'user'
      };
      
      // Create token with all necessary user data
      const tokenData = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        exp: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
      };
      
      const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      
      // Return success with complete user data
      return res.status(200).json({
        token,
        user
      });
    }
    
    // Invalid credentials
    return res.status(401).json({ message: 'Invalid credentials' });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error',
      details: error.message
    });
  }
} 