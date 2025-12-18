import { createClient } from '@supabase/supabase-js';

// Use environment variables in production
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

// Create a single supabase client for the entire app
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase; 