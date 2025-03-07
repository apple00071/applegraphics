const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://qlkxukzmtkkxarcqzysn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your_supabase_key';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 