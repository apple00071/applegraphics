// API index endpoint to verify API directory is working
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // Return API directory info
  res.status(200).json({
    status: 'ok',
    message: 'API directory is accessible',
    endpoints: ['/api/test', '/api/login'],
    timestamp: new Date().toISOString()
  });
} 