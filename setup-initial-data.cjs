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
    // Add initial categories
    console.log('Adding initial categories...');
    const initialCategories = [
      { name: 'Paper', description: 'Various types of printing paper' },
      { name: 'Ink', description: 'Printing inks of different colors' },
      { name: 'Binding', description: 'Materials for binding books and documents' },
      { name: 'Plates', description: 'Printing plates and related materials' }
    ];
    
    const { data: categoriesData, error: insertCategoriesError } = await supabase
      .from('categories')
      .upsert(initialCategories, { onConflict: 'name' })
      .select();
    
    if (insertCategoriesError) {
      console.error('Error inserting categories:', insertCategoriesError);
    } else {
      console.log(`✅ Added/updated ${categoriesData.length} categories`);
    }
    
    // Add initial suppliers
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
    
    const { data: suppliersData, error: insertSuppliersError } = await supabase
      .from('suppliers')
      .upsert(initialSuppliers, { onConflict: 'name' })
      .select();
    
    if (insertSuppliersError) {
      console.error('Error inserting suppliers:', insertSuppliersError);
    } else {
      console.log(`✅ Added/updated ${suppliersData.length} suppliers`);
    }
    
    console.log('Initial data setup completed successfully! 🎉');
    
  } catch (error) {
    console.error('❌ Initial data setup failed:', error.message);
  }
}

// Run the setup
setupInitialData().then(() => {
  console.log('Script finished.');
}); 