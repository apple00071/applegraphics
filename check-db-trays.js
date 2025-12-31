
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking printer_trays...');
    const { data, error } = await supabase
        .from('printer_trays')
        .select('tray_name, paper_size, paper_type')
        .order('id');

    if (error) console.error(error);
    else console.table(data);
}

check();
