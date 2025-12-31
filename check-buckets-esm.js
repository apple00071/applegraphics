
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseKey) { process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) console.error(error);
    else console.log('Current Buckets:', data.map(b => b.name));
}
check();
