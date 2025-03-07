// Simple API endpoint to verify API routes are working
export default function handler(req, res) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // For OPTIONS requests, simply return OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return basic status info
  res.status(200).json({
    status: 'ok',
    message: 'API is working',
    testUsers: [
      { username: 'admin', email: 'admin@printpress.com', password: 'admin123' },
      { username: 'user', email: 'user@printpress.com', password: 'user123' }
    ],
    timestamp: new Date().toISOString()
  });
} 