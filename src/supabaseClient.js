import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔌 Supabase Client Initialized. URL:', supabaseUrl);
console.log('🔌 Supabase Client Key (first 10 chars):', supabaseKey ? supabaseKey.substring(0, 10) : 'None');
console.log('🔌 REACT_APP_SUPABASE_URL Env:', process.env.REACT_APP_SUPABASE_URL);

export default supabase; 