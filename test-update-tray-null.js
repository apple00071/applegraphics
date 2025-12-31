
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY);

async function testUpdateNull() {
    console.log('Attempting update with NULL value (simulating NaN json)...');

    // Get ID 4 for Bypass
    const id = 4;

    // Simulate what happens when NaN is stringified -> null
    const updates = {
        paper_weight_gsm: null,
        updated_at: new Date().toISOString()
    };

    console.log('Sending Payload:', updates);

    const { data, error } = await supabase
        .from('printer_trays')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Update Failed (Expected):', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Update Success (Not Expected):', data);
    }
}

testUpdateNull();
