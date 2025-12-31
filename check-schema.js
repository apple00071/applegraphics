
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY);

async function check() {
    console.log('Checking schema...');
    // There isn't a direct "describe table" in supabase-js, but we can try to insert garbage to see the error or check via introspection if possible.
    // Actually, just checking the types via a select is easier.
    const { data, error } = await supabase
        .from('printer_trays')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        console.log('Sample Data:', data[0]);
        console.log('Types inferred:');
        for (const [key, val] of Object.entries(data[0])) {
            console.log(`${key}: ${typeof val}`);
        }
    }
}

check();
