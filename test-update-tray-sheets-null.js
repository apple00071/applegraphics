
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY);

async function testSheetsNull() {
    console.log('Attempting update with sheets_loaded = NULL...');

    const id = 4;
    const updates = {
        sheets_loaded: null,
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
        console.error('❌ Update Failed (SMOKING GUN FOUND):', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Update Success (Not the cause):', data);
    }
}

testSheetsNull();
