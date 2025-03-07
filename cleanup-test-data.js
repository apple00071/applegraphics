// Script to clean up test data from Supabase
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
  console.log('Starting cleanup of test data...');
  
  try {
    // Delete materials created for testing
    // You can adjust these conditions as needed to target specific test data
    const { data: materials, error: materialError } = await supabase
      .from('materials')
      .delete()
      .eq('name', 'A4 Paper') // Replace with the name of test data
      .select();
    
    if (materialError) {
      console.error('Error deleting test materials:', materialError);
    } else {
      console.log(`Deleted ${materials?.length || 0} test materials`);
    }
    
    // Delete test categories if any were created
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .delete()
      .in('name', ['Test Category']) // Replace with your test category names
      .select();
    
    if (categoryError) {
      console.error('Error deleting test categories:', categoryError);
    } else {
      console.log(`Deleted ${categories?.length || 0} test categories`);
    }
    
    // Delete test suppliers if any were created
    const { data: suppliers, error: supplierError } = await supabase
      .from('suppliers')
      .delete()
      .in('name', ['Test Supplier']) // Replace with your test supplier names
      .select();
    
    if (supplierError) {
      console.error('Error deleting test suppliers:', supplierError);
    } else {
      console.log(`Deleted ${suppliers?.length || 0} test suppliers`);
    }
    
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
cleanupTestData(); 