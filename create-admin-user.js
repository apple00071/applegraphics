import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import readline from 'readline';
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
    console.error("Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (str) => new Promise(resolve => rl.question(str, resolve));

async function createAdmin() {
    try {
        console.log('\n--- Create New Admin User (via Supabase) ---');

        // Check connection by simple query
        const { error: connError } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (connError) {
            throw new Error(`Supabase connection failed: ${connError.message}`);
        }

        const username = await question('Enter Username: ');
        if (!username) throw new Error('Username is required');

        const password = await question('Enter Password: ');
        if (!password) throw new Error('Password is required');

        const email = await question('Enter Email (optional): ') || 'admin@printpress.com';
        // const fullName = await question('Enter Full Name (optional): ') || 'System Administrator';

        console.log(`\nCreating admin user '${username}'...`);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username);

        if (checkError) throw checkError;

        if (existingUsers && existingUsers.length > 0) {
            console.log('User already exists! Updating password instead...');

            const { error: updateError } = await supabase
                .from('users')
                .update({ password: hashedPassword, role: 'admin' })
                .eq('username', username);

            if (updateError) throw updateError;
            console.log('✅ User updated successfully.');
        } else {
            const { error: insertError } = await supabase
                .from('users')
                .insert([{
                    username,
                    password: hashedPassword,
                    role: 'admin',
                    email
                }]);

            if (insertError) throw insertError;
            console.log('✅ New Admin user created successfully.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
    }
}

createAdmin();
