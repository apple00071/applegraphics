const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Setup script to add initial data to the Supabase database
 */
async function setupInitialData() {
  console.log('🚀 Starting initial data setup...');
  console.log(`Using Supabase URL: ${supabaseUrl.substring(0, 20)}...`);
  
  try {
    // Check if categories table exists
    console.log('Checking for categories table...');
    const { error: categoriesTableError } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (categoriesTableError) {
      console.error('Error accessing categories table:', categoriesTableError.message);
      if (categoriesTableError.code === '42P01') {
        console.log('Categories table does not exist. You need to run the SQL script first to create this table.');
      }
    } else {
      // Add initial categories
      console.log('Categories table exists, adding initial categories...');
      const initialCategories = [
        { name: 'Paper', description: 'Various types of printing paper' },
        { name: 'Ink', description: 'Printing inks of different colors' },
        { name: 'Binding', description: 'Materials for binding books and documents' },
        { name: 'Plates', description: 'Printing plates and related materials' }
      ];
      
      const { data: categoriesData, error: insertCategoriesError } = await supabase
        .from('categories')
        .insert(initialCategories)
        .select();
      
      if (insertCategoriesError) {
        console.error('Error inserting categories:', insertCategoriesError);
      } else {
        console.log(`✅ Added ${categoriesData ? categoriesData.length : 0} categories`);
      }
    }
    
    // Check if suppliers table exists
    console.log('Checking for suppliers table...');
    const { error: suppliersTableError } = await supabase
      .from('suppliers')
      .select('count')
      .limit(1);
    
    if (suppliersTableError) {
      console.error('Error accessing suppliers table:', suppliersTableError.message);
      if (suppliersTableError.code === '42P01') {
        console.log('Suppliers table does not exist. You need to run the SQL script first to create this table.');
      }
    } else {
      // Add initial suppliers
      console.log('Suppliers table exists, adding initial suppliers...');
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
      
      const { data: suppliersData, error: insertSuppliersError } = await supabase
        .from('suppliers')
        .insert(initialSuppliers)
        .select();
      
      if (insertSuppliersError) {
        console.error('Error inserting suppliers:', insertSuppliersError);
      } else {
        console.log(`✅ Added ${suppliersData ? suppliersData.length : 0} suppliers`);
      }
    }
    
    console.log('Initial data setup completed! 🎉');
    
  } catch (error) {
    console.error('❌ Initial data setup failed:', error.message);
  }
}

// Run the setup
setupInitialData().then(() => {
  console.log('Script finished.');
}); 