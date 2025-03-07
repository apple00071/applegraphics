// Simple test endpoint to verify API routing
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // Return basic status info
  res.status(200).json({
    status: 'ok',
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
} 