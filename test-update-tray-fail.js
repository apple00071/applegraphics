
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY);

async function testUpdateFail() {
    console.log('Attempting update with EDGE CASE values...');

    const { data: trays } = await supabase.from('printer_trays').select('id').ilike('tray_name', '%Bypass%');
    const id = trays[0].id;

    // Simulate empty inputs and zeros
    const updates = {
        paper_size: '', // Empty string
        paper_type: 'Plain',
        paper_weight_gsm: 0, // Zero
        color: 'White',
        sheets_loaded: 0, // Zero
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
        console.error('❌ Update Failed:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Update Success (Surprisingly):', data);
    }
}

testUpdateFail();
