
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY);

async function testUpdate() {
    console.log('Attempting update on Bypass Tray (ID 4 via name lookup)...');

    // First get the ID
    const { data: trays } = await supabase.from('printer_trays').select('id').ilike('tray_name', '%Bypass%');
    if (!trays || trays.length === 0) {
        console.error('Bypass tray not found');
        return;
    }
    const id = trays[0].id;

    // Payload mimicking PaperCatalog.tsx
    const updates = {
        paper_size: '12x18',
        paper_type: 'Coated G',
        paper_weight_gsm: 300,
        color: 'White',
        sheets_loaded: 100,
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
        console.log('✅ Update Success:', data);
    }
}

testUpdate();
