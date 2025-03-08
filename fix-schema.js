// Script to fix foreign key constraint issue in Supabase database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fix the foreign key constraint issue in the materials table
 * This script provides two approaches to solve the problem:
 * 
 * Option 1: Create a material_categories table as a mirror of categories
 * Option 2: Fix the foreign key constraint to point to the correct table
 */
async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...');
  
  try {
    // Check which tables currently exist
    const { data: tablesData, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError);
      console.log('You might not have sufficient permissions to list tables');
    } else {
      console.log('Existing tables:', tablesData.map(t => t.tablename).join(', '));
    }
    
    // Option 1: Create material_categories table and copy data from categories
    console.log('Creating material_categories table as a copy of categories...');
    
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS material_categories (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (createError) {
      console.error('Error creating material_categories table:', createError);
      console.log('You may need admin privileges for schema changes or use the Supabase dashboard');
    } else {
      console.log('✅ material_categories table created');
      
      // Copy data from categories to material_categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else {
        console.log(`Found ${categoriesData.length} categories to copy`);
        
        for (const category of categoriesData) {
          const { error: insertError } = await supabase
            .from('material_categories')
            .insert(category)
            .select();
          
          if (insertError) {
            console.error(`Error copying category ${category.name}:`, insertError);
          } else {
            console.log(`✅ Copied category: ${category.name}`);
          }
        }
      }
    }
    
    // Option 2: Try to fix the foreign key constraint directly
    console.log('\nAttempting to fix foreign key constraint...');
    console.log('This may require admin privileges and might not work through the Supabase client.');
    console.log('If this fails, please use the Supabase dashboard to fix the constraint manually.');
    
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- First try to drop the constraint
        ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_category_id_fkey;
        
        -- Then add the correct constraint
        ALTER TABLE materials 
        ADD CONSTRAINT materials_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES categories(id);
      `
    });
    
    if (alterError) {
      console.error('Error fixing constraint:', alterError);
      console.log('\nManual Fix Instructions:');
      console.log('1. Log in to https://app.supabase.com');
      console.log('2. Select your project');
      console.log('3. Go to Table Editor');
      console.log('4. Select the "materials" table');
      console.log('5. Go to "Relationships"');
      console.log('6. Look for the foreign key relating to category_id');
      console.log('7. Edit it to point to the "categories" table instead of "material_categories"');
    } else {
      console.log('✅ Foreign key constraint updated successfully!');
    }
    
    console.log('\nSchema fix attempt completed');
  } catch (error) {
    console.error('❌ Database schema fix failed:', error.message);
  }
}

// Run the fix
fixDatabaseSchema(); 