// Script to extract job numbers from order notes and update the job_number field
// Run this using Node.js: node fix-order-job-numbers.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your Supabase URL and key
const supabaseUrl = 'https://qlkxukzmtkkxarcqzysn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsa3h1a3ptdGtreGFyY3F6eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNTkzODcsImV4cCI6MjA1NjgzNTM4N30.60ab2zNHSUkm23RR_NUo9-yDlUo3lcqOUnIF4M-0K0o';
const supabase = createClient(supabaseUrl, supabaseKey);

async function extractJobNumbersFromOrders() {
  try {
    console.log('Fetching orders...');
    
    // Get all orders that have notes but no job_number
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, notes, job_number')
      .is('job_number', null);
      
    if (error) {
      throw error;
    }
    
    console.log(`Found ${orders.length} orders without job numbers`);
    
    let updatedCount = 0;
    
    // Process each order
    for (const order of orders) {
      if (!order.notes) {
        console.log(`Order ${order.id} has no notes, skipping`);
        continue;
      }
      
      // Try to extract job number from notes
      const jobNumber = extractJobNumberFromNotes(order.notes);
      
      if (jobNumber) {
        console.log(`Found job number "${jobNumber}" for order ${order.id}`);
        
        // Update the order with the extracted job number
        const { error: updateError } = await supabase
          .from('orders')
          .update({ job_number: jobNumber })
          .eq('id', order.id);
          
        if (updateError) {
          console.error(`Error updating order ${order.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Updated order ${order.id} with job number ${jobNumber}`);
        }
      } else {
        console.log(`No job number found in notes for order ${order.id}`);
      }
    }
    
    console.log(`Completed processing. Updated ${updatedCount} orders with job numbers.`);
    
  } catch (error) {
    console.error('Error processing orders:', error);
  }
}

function extractJobNumberFromNotes(notes) {
  // Look for the job number in the notes
  try {
    // Check if the notes contain print specifications
    if (notes.includes('=== PRINT SPECIFICATIONS ===')) {
      // Split the notes into sections
      const sections = notes.split('===');
      
      // Find the print specifications section
      const printSpecsSection = sections.find(section => 
        section.trim().startsWith('PRINT SPECIFICATIONS')
      );
      
      if (printSpecsSection) {
        // Look for the job number line
        const lines = printSpecsSection.split('\n');
        const jobNumberLine = lines.find(line => 
          line.trim().toLowerCase().startsWith('job number:')
        );
        
        if (jobNumberLine) {
          // Extract the job number value
          const jobNumber = jobNumberLine.split(':')[1].trim();
          
          // If the job number is not 'N/A', return it
          if (jobNumber && jobNumber !== 'N/A') {
            return jobNumber;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting job number:', error);
    return null;
  }
}

// Run the function
extractJobNumbersFromOrders(); 