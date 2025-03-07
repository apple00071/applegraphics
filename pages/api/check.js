// Simple API endpoint to verify API routes are working
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'API is working',
    env: {
      supabaseUrlSet: !!process.env.SUPABASE_URL,
      supabaseKeySet: !!process.env.SUPABASE_KEY,
      jwtSecretSet: !!process.env.JWT_SECRET
    },
    timestamp: new Date().toISOString()
  });
} 