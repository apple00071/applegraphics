// Script to clean up test data from Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Replace with your Supabase URL and key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Function to clean up test data from Supabase
 * By default, it will delete materials, categories, and suppliers that match certain patterns
 */
async function cleanupTestData() {
  console.log('🧹 Starting cleanup process...');
  
  try {
    // 1. Delete test materials
    console.log('Deleting test materials...');
    // Replace these names with your actual test material names
    const testMaterialNames = ['A4 Paper', 'Test Material', 'Demo Product'];
    
    const { data: deletedMaterials, error: materialsError } = await supabase
      .from('materials')
      .delete()
      .in('name', testMaterialNames)
      .select();
    
    if (materialsError) {
      console.error('Error deleting materials:', materialsError);
    } else {
      console.log(`✅ Deleted ${deletedMaterials?.length || 0} test materials`);
    }
    
    // 2. Delete test categories
    console.log('Deleting test categories...');
    // Replace these names with your actual test category names
    const testCategoryNames = ['Test Category', 'Demo Category'];
    
    const { data: deletedCategories, error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .in('name', testCategoryNames)
      .select();
    
    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError);
    } else {
      console.log(`✅ Deleted ${deletedCategories?.length || 0} test categories`);
    }
    
    // 3. Delete test suppliers
    console.log('Deleting test suppliers...');
    // Replace these names with your actual test supplier names
    const testSupplierNames = ['Test Supplier', 'Demo Supplier'];
    
    const { data: deletedSuppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .delete()
      .in('name', testSupplierNames)
      .select();
    
    if (suppliersError) {
      console.error('Error deleting suppliers:', suppliersError);
    } else {
      console.log(`✅ Deleted ${deletedSuppliers?.length || 0} test suppliers`);
    }
    
    console.log('Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Run the cleanup
cleanupTestData(); 