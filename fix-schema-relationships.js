/**
 * Script to fix schema relationships in Supabase
 * This script will:
 * 1. Check if relationships exist
 * 2. Create missing relationships
 * 3. Refresh the schema cache
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
console.log('Using Supabase URL:', supabaseUrl);

// We need a service role key for schema modifications
// WARNING: This script requires admin privileges and should only be run by a database administrator
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if we have the service role key
if (!serviceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required to modify schema');
  console.error('This key can be found in your Supabase dashboard under Settings > API');
  console.error('WARNING: Keep this key secure and never expose it in client-side code');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixSchemaRelationships() {
  console.log('🔧 Starting schema relationship repair...');
  
  try {
    // 1. Check if the necessary tables exist
    console.log('Checking if tables exist...');
    
    // Execute raw SQL to check the relationships
    const { data: checkResult, error: checkError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT 
          conname AS constraint_name,
          conrelid::regclass AS table_name,
          a.attname AS column_name,
          confrelid::regclass AS referenced_table,
          af.attname AS referenced_column
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
        WHERE c.contype = 'f'
          AND c.conrelid::regclass::text = 'materials'
          AND c.confrelid::regclass::text = 'categories';
      `
    });
    
    if (checkError) {
      console.error('Error checking relationships:', checkError);
      return;
    }
    
    console.log('Relationship check result:', checkResult);
    
    let needsToFixMaterialsCategories = true;
    let needsToFixMaterialsSuppliers = true;
    
    if (checkResult && checkResult.length > 0) {
      console.log('✅ materials -> categories relationship exists');
      needsToFixMaterialsCategories = false;
    } else {
      console.log('❌ materials -> categories relationship missing');
    }
    
    // Check materials -> suppliers relationship
    const { data: checkSuppliers, error: checkSuppliersError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT 
          conname AS constraint_name
        FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.conrelid::regclass::text = 'materials'
          AND c.confrelid::regclass::text = 'suppliers';
      `
    });
    
    if (checkSuppliersError) {
      console.error('Error checking suppliers relationship:', checkSuppliersError);
    } else if (checkSuppliers && checkSuppliers.length > 0) {
      console.log('✅ materials -> suppliers relationship exists');
      needsToFixMaterialsSuppliers = false;
    } else {
      console.log('❌ materials -> suppliers relationship missing');
    }
    
    // 2. Create missing relationships
    if (needsToFixMaterialsCategories) {
      console.log('Adding materials -> categories relationship...');
      
      // First, ensure any null category_ids are handled
      const { error: fixNullsError } = await supabase.rpc('execute_sql', {
        sql_query: `
          UPDATE materials 
          SET category_id = NULL 
          WHERE category_id IS NOT NULL AND
                NOT EXISTS (SELECT 1 FROM categories WHERE categories.id = materials.category_id);
        `
      });
      
      if (fixNullsError) {
        console.error('Error fixing null category_ids:', fixNullsError);
      }
      
      // Add the foreign key constraint
      const { error: addConstraintError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE materials
          ADD CONSTRAINT materials_category_id_fkey
          FOREIGN KEY (category_id)
          REFERENCES categories(id)
          ON DELETE SET NULL;
        `
      });
      
      if (addConstraintError) {
        console.error('Error adding categories relationship:', addConstraintError);
      } else {
        console.log('✅ Added materials -> categories relationship');
      }
    }
    
    if (needsToFixMaterialsSuppliers) {
      console.log('Adding materials -> suppliers relationship...');
      
      // Fix any invalid supplier_ids
      const { error: fixNullsError } = await supabase.rpc('execute_sql', {
        sql_query: `
          UPDATE materials 
          SET supplier_id = NULL 
          WHERE supplier_id IS NOT NULL AND
                NOT EXISTS (SELECT 1 FROM suppliers WHERE suppliers.id = materials.supplier_id);
        `
      });
      
      if (fixNullsError) {
        console.error('Error fixing null supplier_ids:', fixNullsError);
      }
      
      // Add the constraint
      const { error: addConstraintError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE materials
          ADD CONSTRAINT materials_supplier_id_fkey
          FOREIGN KEY (supplier_id)
          REFERENCES suppliers(id)
          ON DELETE SET NULL;
        `
      });
      
      if (addConstraintError) {
        console.error('Error adding suppliers relationship:', addConstraintError);
      } else {
        console.log('✅ Added materials -> suppliers relationship');
      }
    }
    
    // 3. Refresh the schema cache
    console.log('Refreshing schema cache...');
    
    const { error: refreshError } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- This forces Postgres to refresh its internal caches
        ANALYZE materials;
        ANALYZE categories;
        ANALYZE suppliers;
      `
    });
    
    if (refreshError) {
      console.error('Error refreshing schema cache:', refreshError);
    } else {
      console.log('✅ Schema cache refreshed');
    }
    
    console.log('🎉 Schema relationship repair completed!');
    
  } catch (error) {
    console.error('❌ Error fixing schema relationships:', error);
  }
}

// Run the script
fixSchemaRelationships()
  .then(() => console.log('Script finished.'))
  .catch(err => console.error('Script failed:', err)); 