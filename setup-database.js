import supabase from './src/supabaseClient.js';

/**
 * Setup script to create necessary tables and seed initial data in Supabase
 */

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  // Check if categories table exists
  try {
    console.log('Checking for categories table...');
    const { error: categoriesError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (categoriesError) {
      if (categoriesError.code === '42P01') { // relation does not exist
        console.log('Categories table does not exist, creating it...');
        
        // Create categories table
        const { error: createCategoriesError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS categories (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL UNIQUE,
              description TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        if (createCategoriesError) {
          throw new Error(`Failed to create categories table: ${createCategoriesError.message}`);
        }
        
        console.log('✅ Categories table created');
      } else {
        throw new Error(`Error checking categories table: ${categoriesError.message}`);
      }
    } else {
      console.log('✅ Categories table exists');
    }
    
    // Add initial categories if table is empty
    const { data: categoriesData, error: categoriesCheckError } = await supabase
      .from('categories')
      .select('count')
      .single();
    
    if (categoriesCheckError && categoriesCheckError.code !== 'PGRST116') {
      throw new Error(`Error checking categories count: ${categoriesCheckError.message}`);
    }
    
    if (!categoriesData || categoriesData.count === 0) {
      console.log('Adding initial categories...');
      
      const initialCategories = [
        { name: 'Paper', description: 'Various types of printing paper' },
        { name: 'Ink', description: 'Printing inks of different colors' },
        { name: 'Binding', description: 'Materials for binding books and documents' },
        { name: 'Plates', description: 'Printing plates and related materials' }
      ];
      
      const { error: insertCategoriesError } = await supabase
        .from('categories')
        .insert(initialCategories);
      
      if (insertCategoriesError) {
        throw new Error(`Failed to insert categories: ${insertCategoriesError.message}`);
      }
      
      console.log('✅ Initial categories added');
    } else {
      console.log('✅ Categories already exist, skipping seeding');
    }
    
    // Similar process for suppliers
    console.log('Checking for suppliers table...');
    const { error: suppliersError } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1);
    
    if (suppliersError) {
      if (suppliersError.code === '42P01') { // relation does not exist
        console.log('Suppliers table does not exist, creating it...');
        
        // Create suppliers table
        const { error: createSuppliersError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS suppliers (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              contact_person TEXT,
              email TEXT,
              phone TEXT,
              address TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        if (createSuppliersError) {
          throw new Error(`Failed to create suppliers table: ${createSuppliersError.message}`);
        }
        
        console.log('✅ Suppliers table created');
      } else {
        throw new Error(`Error checking suppliers table: ${suppliersError.message}`);
      }
    } else {
      console.log('✅ Suppliers table exists');
    }
    
    // Add initial suppliers if table is empty
    const { data: suppliersData, error: suppliersCheckError } = await supabase
      .from('suppliers')
      .select('count')
      .single();
    
    if (suppliersCheckError && suppliersCheckError.code !== 'PGRST116') {
      throw new Error(`Error checking suppliers count: ${suppliersCheckError.message}`);
    }
    
    if (!suppliersData || suppliersData.count === 0) {
      console.log('Adding initial suppliers...');
      
      const initialSuppliers = [
        { 
          name: 'Paper Supply Co.', 
          contact_person: 'John Smith', 
          email: 'john@papersupply.com', 
          phone: '555-1234' 
        },
        { 
          name: 'Premium Inks Ltd.', 
          contact_person: 'Sarah Johnson', 
          email: 'sarah@premiuminks.com', 
          phone: '555-5678' 
        },
        { 
          name: 'Binding Specialists', 
          contact_person: 'Mike Brown', 
          email: 'mike@bindingspecialists.com', 
          phone: '555-9012' 
        }
      ];
      
      const { error: insertSuppliersError } = await supabase
        .from('suppliers')
        .insert(initialSuppliers);
      
      if (insertSuppliersError) {
        throw new Error(`Failed to insert suppliers: ${insertSuppliersError.message}`);
      }
      
      console.log('✅ Initial suppliers added');
    } else {
      console.log('✅ Suppliers already exist, skipping seeding');
    }
    
    console.log('Database setup completed successfully! 🎉');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
}

// Run the setup
setupDatabase(); 