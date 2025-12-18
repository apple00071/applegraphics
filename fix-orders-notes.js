// Script to fix missing notes in orders
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key. Set REACT_APP_SUPABASE_ANON_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrdersWithMissingNotes() {
  try {
    console.log('Fetching orders with null notes...');
    
    // Fetch orders that have null notes but have a job number
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .is('notes', null)
      .not('job_number', 'is', null);
    
    if (error) {
      throw error;
    }
    
    if (!orders || orders.length === 0) {
      console.log('No orders with missing notes found.');
      return;
    }
    
    console.log(`Found ${orders.length} orders with missing notes.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each order
    for (const order of orders) {
      try {
        // Create formatted notes from available data
        const formattedNotes = `=== PRINT SPECIFICATIONS ===
Job Number: ${order.job_number || 'N/A'}
Product Name: ${'N/A'}
Printing Date: ${new Date(order.order_date).toISOString().split('T')[0] || 'N/A'}
Quantity: ${'N/A'}
Numbering: ${'N/A'}
Binding Type: ${'N/A'}
Paper Quality: ${'N/A'}
Number of Pages: ${'N/A'}

=== CONTACT INFORMATION ===
Contact: ${order.customer_contact || order.customer_name || 'N/A'}
Email: ${order.customer_email || 'N/A'}

=== ADDITIONAL NOTES ===
Order restored from missing notes.`;
        
        // Update the order with the formatted notes
        const { error: updateError } = await supabase
          .from('orders')
          .update({ notes: formattedNotes })
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`Error updating order ${order.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`Successfully updated order ${order.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`Error processing order ${order.id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`Update complete. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error fixing orders:', error);
  }
}

// Execute the function
fixOrdersWithMissingNotes()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err)); 