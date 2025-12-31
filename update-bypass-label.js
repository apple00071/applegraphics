
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix ESM __dirname
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Updating Bypass Tray default label...');
    const { error } = await supabase
        .from('printer_trays')
        .update({ paper_size: 'Custom' }) // Generic default
        .ilike('tray_name', '%Bypass%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Updated Bypass tray to generic "Custom" size.');
    }
}

run();
