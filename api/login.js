// Vercel Serverless Function for login
export default function handler(req, res) {
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
    // Mock login logic - SHOULD BE REPLACED WITH REAL DATABASE AUTH IN PRODUCTION
    // NOTE: We're keeping this functionality to allow login in production
    // In a real app, you would verify credentials against a database
    const { username, password } = req.body;
    
    // PRODUCTION NOTE: Replace this with a secure database lookup and password verification
    if (username === 'admin' && password === 'admin123') {
      return res.status(200).json({
        token: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'admin',
          role: 'admin',
          email: 'admin@example.com'
        }
      });
    } else if (username === 'user' && password === 'user123') {
      return res.status(200).json({
        token: 'mock-jwt-token-user',
        user: {
          id: 2,
          username: 'user',
          role: 'user',
          email: 'user@example.com'
        }
      });
    } else {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
} 