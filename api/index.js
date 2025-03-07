// API index endpoint to verify API directory is working
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // Return API directory info
  res.status(200).json({
    status: 'ok',
    message: 'API directory is accessible',
    endpoints: ['/api/test', '/api/login', '/api/simple'],
    timestamp: new Date().toISOString()
  });
} 