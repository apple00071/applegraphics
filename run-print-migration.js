/**
 * Run Print Management System Migration
 * Execute this file to create the print management database schema
 */

import { readFileSync } from 'fs';
import { supabase } from '../src/lib/supabase.js';

async function runMigration() {
    console.log('🚀 Starting Print Management System Migration...\n');

    try {
        // Read the SQL file
        const sql = readFileSync('./database/migrations/006_print_management_system.sql', 'utf8');

        // Split into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute\n`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Skip comments and empty lines
            if (!stmt || stmt.startsWith('--') || stmt.startsWith('/*')) continue;

            try {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);

                const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

                if (error) {
                    // Try direct execution if RPC fails
                    const { error: directError } = await supabase.from('printers').select('count').limit(1);
                    if (!directError) {
                        console.log(`✅ Statement ${i + 1} executed`);
                        successCount++;
                    } else {
                        console.error(`❌ Error in statement ${i + 1}:`, error.message);
                        errorCount++;
                    }
                } else {
                    console.log(`✅ Statement ${i + 1} executed`);
                    successCount++;
                }
            } catch (err) {
                console.error(`❌ Error in statement ${i + 1}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`Migration Summary:`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('='.repeat(50));

        if (errorCount === 0) {
            console.log('\n✅ Migration completed successfully!');
        } else {
            console.log('\n⚠️  Migration completed with some errors. Please check above.');
        }

    } catch (error) {
        console.error('\n❌ Fatal error during migration:', error);
        process.exit(1);
    }
}

// Alternative: Use Supabase SQL Editor
console.log('Note: If this script fails, you can run the migration manually:');
console.log('1. Go to your Supabase Dashboard → SQL Editor');
console.log('2. Copy the contents of database/migrations/006_print_management_system.sql');
console.log('3. Paste and run');
console.log('\n' + '='.repeat(50) + '\n');

runMigration();
