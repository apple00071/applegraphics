const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// For this operation, we need the service role key, not the anon key
// THIS IS TEMPORARY - we'll console log instructions if not available
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function refreshSchemaCache() {
  if (!serviceRoleKey) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️ SERVICE ROLE KEY NOT FOUND');
    console.log('\x1b[36m%s\x1b[0m', `
To refresh the Supabase schema cache, you need to:

1. Go to your Supabase dashboard: https://app.supabase.io
2. Select your project
3. Go to Settings > API
4. Copy the "service_role" key (NOT the anon key)
5. Run this script again with:

   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node refresh-schema-cache.js

Alternatively, you can run this SQL query in the Supabase SQL Editor:

   SELECT pg_sleep(0.5);
   SELECT pg_notify('pgrst', 'reload schema');

This will manually trigger a schema cache refresh.
`);
    return;
  }

  console.log('🔄 Refreshing Supabase schema cache...');
  
  try {
    // Create a supabase client with the service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Execute a query to trigger schema refresh
    const { error } = await supabase.rpc('pg_notify', {
      channel: 'pgrst',
      payload: 'reload schema'
    });
    
    if (error) {
      console.error('❌ Error refreshing schema:', error.message);
      console.log('\x1b[36m%s\x1b[0m', `
Try running this SQL query directly in the Supabase SQL Editor:

   SELECT pg_sleep(0.5);
   SELECT pg_notify('pgrst', 'reload schema');
`);
      return;
    }
    
    console.log('✅ Schema cache refreshed successfully!');
    console.log('Please wait 10-15 seconds for the cache to fully update.');
    console.log('Then try creating an order again.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

refreshSchemaCache(); 