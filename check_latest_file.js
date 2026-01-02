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

async function checkLatestOrder() {
    console.log("Checking last 5 orders...");

    const { data, error } = await supabase
        .from('orders')
        .select('id, job_number, file_path, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.table(data);
        data.forEach(order => {
            console.log(`Job: ${order.job_number || 'N/A'} | Path: ${order.file_path}`);
        });
    }
}

checkLatestOrder();
