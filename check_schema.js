import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking 'orders' table schema...");

    // Try to select the 'file_path' column from the first order
    const { data, error } = await supabase
        .from('orders')
        .select('id, file_path')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting file_path:", error.message);
        console.log("This likely means the 'file_path' column does NOT exist.");
        console.log("Please run the SQL command to add it.");
    } else {
        console.log("✅ Success! 'file_path' column exists.");
        console.log("Data sample:", data);
    }
}

checkSchema();
