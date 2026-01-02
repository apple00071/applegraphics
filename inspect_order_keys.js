import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectKeys() {
    console.log("Fetching one order to see keys...");

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error:", error);
    } else if (data && data.length > 0) {
        console.log("✅ Order Keys:", Object.keys(data[0]));
        console.log("Sample Data:", {
            job_number: data[0].job_number,
            name: data[0].name, // common guess
            job_name: data[0].job_name // checking if this even exists
        });
    } else {
        console.log("No orders found.");
    }
}

inspectKeys();
