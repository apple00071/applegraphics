const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Create supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 