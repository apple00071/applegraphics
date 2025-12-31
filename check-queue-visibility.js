
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseKey) { console.error("Missing Key"); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQueue() {
    console.log('Checking print_jobs queue...');
    const { data, error } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('status', 'queued');

    if (error) {
        console.error('❌ Error fetching queue:', error);
    } else {
        console.log(`✅ Found ${data.length} queued jobs.`);
        if (data.length > 0) {
            console.log('Sample Job:', data[0]);
        } else {
            console.log('⚠️ Queue is empty from this script\'s perspective (RLS might be hiding jobs).');
        }
    }
}

checkQueue();
