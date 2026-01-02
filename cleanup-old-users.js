import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupUsers() {
    try {
        console.log('\n--- Cleanup Old Users ---');
        const KEEP_USER = 'Pavan';

        // 1. List users to be deleted
        const { data: usersToDelete, error: fetchError } = await supabase
            .from('users')
            .select('username, role')
            .neq('username', KEEP_USER);

        if (fetchError) throw fetchError;

        if (!usersToDelete || usersToDelete.length === 0) {
            console.log(`No other users found. Only '${KEEP_USER}' exists.`);
            return;
        }

        console.log(`Found ${usersToDelete.length} users to delete:`);
        usersToDelete.forEach(u => console.log(` - ${u.username} (${u.role})`));

        // 2. Delete them
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .neq('username', KEEP_USER);

        if (deleteError) throw deleteError;

        console.log('\n✅ Successfully deleted all old users.');
        console.log(`🔒 The only remaining user is: '${KEEP_USER}'`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

cleanupUsers();
