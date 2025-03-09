import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

// Define types for our direct insert function
interface OrderData {
  customerName: string;
  orderDate: string;
  requiredDate: string;
  status: string;
  notes: string;
  totalAmount: number;
  jobNumber?: string;
  customerContact: string;
  customerEmail: string;
  productName?: string;
  printingDate?: string;
  quantity?: string;
  numbering?: string;
  bindingType?: string;
  paperQuality?: string;
  numberOfPages?: string;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  message: string;
}

// Helper function to insert order directly using SQL - bypasses schema cache issues
const createOrderDirectly = async (orderData: OrderData): Promise<OrderResult> => {
  try {
    console.log('Trying to create order with data:', orderData);
    
    // Format notes with all the order details
    const formattedNotes = `=== PRINT SPECIFICATIONS ===
Job Number: ${orderData.jobNumber || 'N/A'}
Product Name: ${orderData.productName || 'N/A'}
Printing Date: ${orderData.printingDate || 'N/A'}
Quantity: ${orderData.quantity || 'N/A'}
Numbering: ${orderData.numbering || 'N/A'}
Binding Type: ${orderData.bindingType || 'N/A'}
Paper Quality: ${orderData.paperQuality || 'N/A'}
Number of Pages: ${orderData.numberOfPages || 'N/A'}

=== CONTACT INFORMATION ===
Contact: ${orderData.customerContact || 'N/A'}
Email: ${orderData.customerEmail || 'N/A'}

=== ADDITIONAL NOTES ===
${orderData.notes || 'None'}`;
    
    // Try the flexible function first - most likely to work with the actual table structure
    console.log('Trying flexible_insert_order...');
    try {
      const { data: flexibleData, error: flexibleError } = await supabase.rpc('flexible_insert_order', {
        name_param: orderData.customerName,
        customer_name_param: orderData.customerName,
        customer_contact_param: orderData.customerContact,
        customer_email_param: orderData.customerEmail,
        order_date_text: orderData.orderDate,
        required_date_text: orderData.requiredDate,
        status_text: orderData.status,
        notes_text: formattedNotes,
        total_amount_val: Number(orderData.totalAmount),
        job_number_text: orderData.jobNumber || undefined
      });
      
      if (!flexibleError) {
        console.log("Order created successfully with flexible function, ID:", flexibleData);
        return { success: true, orderId: flexibleData, message: "Order created successfully" };
      } else {
        console.error("Flexible insert failed:", flexibleError);
        // Continue to try other methods
      }
    } catch (flexError) {
      console.error("Error with flexible insert:", flexError);
      // Continue to try other methods
    }
    
    // Try direct insert as a last resort
    const { data: directData, error: directError } = await supabase
      .from('orders')
      .insert([{
        customer_name: orderData.customerName,
        customer_contact: orderData.customerContact,
        customer_email: orderData.customerEmail,
        order_date: orderData.orderDate,
        required_date: orderData.requiredDate,
        status: orderData.status,
        notes: formattedNotes,
        total_amount: orderData.totalAmount,
        job_number: orderData.jobNumber || undefined
      }])
      .select()
      .single();
    
    if (directError) {
      throw directError;
    }
    
    return { success: true, orderId: directData.id, message: "Order created successfully" };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return { success: false, orderId: undefined, message: error.message || "Failed to create order" };
  }
};

// Custom icon component
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

interface Material {
  id: string;
  name: string;
  current_stock: number;
  unit_price: number;
  unit_of_measure: string;
}

interface OrderItem {
  material_id: string;
  quantity: number;
  unit_price: number;
}

interface Customer {
  id: number;
  name: string;
}

const AddOrder: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sqlFunctionExists, setSqlFunctionExists] = useState<boolean | null>(null);
  
  // Form state - Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // Order dates
  const [requiredDate, setRequiredDate] = useState('');
  const [printingDate, setPrintingDate] = useState('');
  
  // Print specifications
  const [jobNumber, setJobNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [numbering, setNumbering] = useState('');
  const [bindingType, setBindingType] = useState('');
  const [paperQuality, setPaperQuality] = useState('');
  const [numberOfPages, setNumberOfPages] = useState('');
  
  // Notes and materials (optional)
  const [notes, setNotes] = useState('');
  const [includeMaterials, setIncludeMaterials] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([
    { material_id: '0', quantity: 1, unit_price: 0 }
  ]);
  
  // Track if there's a schema cache error
  const [hasSchemaCacheError, setHasSchemaCacheError] = useState(false);

  // Fetch data and check if SQL function exists
  useEffect(() => {
    const setupAndFetchData = async () => {
      // Check if SQL function exists
      try {
        const { data, error } = await supabase.rpc('direct_insert_order', {
          customer_name_param: 'test',
          order_date_param: new Date().toISOString(),
          required_date_param: new Date().toISOString(),
          status_param: 'test',
          notes_param: 'test',
          total_amount_param: 0
        });
        
        // If we get an error about the function not existing
        if (error && (error.message.includes('does not exist') || error.code === '404')) {
          setSqlFunctionExists(false);
        } else {
          // Function exists, but we might have gotten another error or even success
          // (this is just a test call that will likely fail with a validation error)
          setSqlFunctionExists(true);
        }
      } catch (err) {
        // If we get here, it's usually because the function doesn't exist
        setSqlFunctionExists(false);
      }
      
      // Fetch other data
      await fetchData();
    };
    
    setupAndFetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real customers and materials from Supabase
      const customersPromise = supabase.from('customers').select('*').order('name');
      const materialsPromise = supabase.from('materials').select('*').order('name');
      
      const [customersResponse, materialsResponse] = await Promise.all([
        customersPromise,
        materialsPromise
      ]);
      
      if (customersResponse.error) {
        console.error('Error fetching customers:', customersResponse.error);
        setCustomers([]);
      } else {
        setCustomers(customersResponse.data || []);
      }
      
      if (materialsResponse.error) {
        console.error('Error fetching materials:', materialsResponse.error);
        setMaterials([]);
      } else {
        const materialsData = materialsResponse.data || [];
        console.log('Materials fetched:', materialsData);
        setMaterials(materialsData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update item details
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    
    if (field === 'material_id') {
      const material = materials.find(m => String(m.id) === String(value));
      
      if (material) {
        newItems[index].material_id = material.id;
        newItems[index].unit_price = material.unit_price;
      }
    } else {
      // @ts-ignore
      newItems[index][field] = value;
    }
    
    setItems(newItems);
  };

  // Add new item field
  const addItem = () => {
    setItems([...items, { material_id: '0', quantity: 1, unit_price: 0 }]);
  };

  // Remove item field
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // Calculate total
  const calculateTotal = () => {
    if (!includeMaterials) return 0;
    return items.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0);
  };

  // Compile print specifications into a formatted string
  const formatPrintSpecifications = () => {
    const specs = [
      `Job Number: ${jobNumber || 'N/A'}`,
      `Product Name: ${productName || 'N/A'}`,
      `Printing Date: ${printingDate || 'N/A'}`,
      `Quantity: ${quantity || 'N/A'}`,
      `Numbering: ${numbering || 'N/A'}`,
      `Binding Type: ${bindingType || 'N/A'}`,
      `Paper Quality: ${paperQuality || 'N/A'}`,
      `Number of Pages: ${numberOfPages || 'N/A'}`
    ];
    
    const contactInfo = [
      `Contact: ${customerContact || 'N/A'}`,
      `Email: ${customerEmail || 'N/A'}`
    ];
    
    return `=== PRINT SPECIFICATIONS ===\n${specs.join('\n')}\n\n=== CONTACT INFORMATION ===\n${contactInfo.join('\n')}\n\n=== ADDITIONAL NOTES ===\n${notes || 'None'}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName) {
      toast.error('Please enter customer name');
      return;
    }
    
    if (!requiredDate) {
      toast.error('Please select required date');
      return;
    }
    
    if (includeMaterials && items.some(item => item.material_id === '0')) {
      toast.error('Please select materials for all items or disable material selection');
      return;
    }
    
    try {
      setIsLoading(true);
      setHasSchemaCacheError(false); // Reset error state
      
      // Calculate total amount
      const totalAmount = calculateTotal();
      
      // Prepare print specifications note
      const formattedNotes = formatPrintSpecifications();
      
      // Create order using direct SQL method to bypass schema cache
      const result = await createOrderDirectly({
        customerName,
        orderDate: new Date().toISOString(),
        requiredDate: new Date(requiredDate).toISOString(),
        status: 'pending',
        notes: formattedNotes,
        totalAmount,
        jobNumber,
        customerContact,
        customerEmail,
        productName,
        printingDate,
        quantity,
        numbering,
        bindingType,
        paperQuality,
        numberOfPages
      });
      
      if (!result.success) {
        // Check for the specific database structure mismatch message
        if (result.message.includes("Database schema mismatch") || 
            result.message.includes("column") && result.message.includes("does not exist")) {
          setHasSchemaCacheError(true);
          toast.error("Database structure mismatch detected. Please check the instructions at the top of the page.");
          return;
        }
        
        toast.error(`Failed to create order: ${result.message}`);
        return;
      }
      
      // Handle material updates if we have a valid order ID and materials are included
      if (result.orderId && includeMaterials) {
        // Process order items
        const orderItems = items.map(item => ({
          order_id: result.orderId,
          material_id: item.material_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));
        
        let itemsInsertSuccess = false;
        
        // First try direct insertion
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);
        
        if (itemsError) {
          console.error('Error creating order items:', itemsError);
          
          // If table insertion fails, try using the direct function for each item
          console.log('Trying to use direct_insert_order_item function as fallback...');
          let functionErrors = 0;
          
          for (const item of items) {
            try {
              const { data, error } = await supabase.rpc('direct_insert_order_item', {
                order_id_param: result.orderId,
                material_id_param: item.material_id,
                quantity_param: item.quantity,
                unit_price_param: item.unit_price
              });
              
              if (error) {
                console.error(`Error inserting item using function:`, error);
                functionErrors++;
              }
            } catch (err) {
              console.error(`Exception when inserting item using function:`, err);
              functionErrors++;
            }
          }
          
          if (functionErrors === 0) {
            itemsInsertSuccess = true;
            console.log('Successfully inserted all items using direct functions');
          } else if (functionErrors < items.length) {
            itemsInsertSuccess = true;
            console.warn(`Inserted some items but ${functionErrors} failed`);
          } else {
            toast.error(`Order created but items failed: ${itemsError.message}`);
            return;
          }
        } else {
          itemsInsertSuccess = true;
          console.log('Successfully inserted order items directly');
        }
        
        // Only update inventory if we successfully inserted at least some items
        if (itemsInsertSuccess) {
          // Update inventory - reduce stock for each item
          for (const item of items) {
            const material = materials.find(m => m.id === item.material_id);
            if (material) {
              const newStock = material.current_stock - item.quantity;
              
              const { error: updateError } = await supabase
                .from('materials')
                .update({ current_stock: newStock })
                .eq('id', item.material_id);
              
              if (updateError) {
                console.error(`Error updating stock for material ${item.material_id}:`, updateError);
                // Continue with other items
              }
            }
          }
        }
      }
      
      // Show appropriate message based on result
      toast.success(result.message);
      navigate('/orders');
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(`Failed to create order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle alternative submission when schema cache issues arise
  const handleManualSubmit = async () => {
    if (!customerName || !requiredDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const totalAmount = calculateTotal();
      const formattedNotes = formatPrintSpecifications();
      
      // Create a simplified order object
      const order = {
        customerName,
        orderDate: new Date().toISOString(),
        requiredDate: new Date(requiredDate).toISOString(),
        status: 'pending',
        notes: formattedNotes,
        totalAmount,
        items: includeMaterials ? items.map(item => {
          const material = materials.find(m => m.id === item.material_id);
          return {
            ...item,
            materialName: material?.name || 'Unknown',
            unitOfMeasure: material?.unit_of_measure || ''
          };
        }) : []
      };
      
      // Store the order data in localStorage as a workaround
      const existingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
      existingOrders.push({
        id: `temp-${Date.now()}`,
        ...order,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('pendingOrders', JSON.stringify(existingOrders));
      
      toast.success('Order saved locally. Please contact support to resolve the database issue.');
      navigate('/orders');
    } catch (error: any) {
      console.error('Error in manual submit:', error);
      toast.error('Failed to save order locally: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6">
        {sqlFunctionExists === false && (
          <div className="mb-6 p-4 border border-amber-300 bg-amber-50 rounded-md">
            <h3 className="font-semibold text-amber-800">Database Setup Required</h3>
            <p className="text-amber-700 mb-2">
              The SQL function needed for order creation hasn't been set up yet.
            </p>
            <div className="mt-2">
              <p className="text-sm font-medium text-amber-800">Please follow these steps:</p>
              <ol className="text-sm list-decimal pl-5 mt-1 text-amber-700">
                <li>Open your Supabase dashboard</li>
                <li>Go to SQL Editor</li>
                <li>Create a new query</li>
                <li>Copy and paste the content from check-tables.sql</li>
                <li>Run the script</li>
                <li>Refresh this page and try again</li>
              </ol>
            </div>
          </div>
        )}
        
        {hasSchemaCacheError && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-md">
            <h3 className="font-semibold text-red-800">Database Structure Mismatch</h3>
            <p className="text-red-700 mb-2">
              There appears to be a mismatch between the expected and actual database structure.
              The error message indicates that the "customer_name" column doesn't exist in the orders table.
            </p>
            <div className="mt-2">
              <p className="text-sm font-medium text-red-800">Please follow these steps to diagnose and fix:</p>
              <ol className="text-sm list-decimal pl-5 mt-1 text-red-700">
                <li>Open your Supabase dashboard</li>
                <li>Go to SQL Editor</li>
                <li>Create a new query</li>
                <li>Run this SQL to check your table structure:
                  <pre className="bg-gray-100 p-2 mt-1 text-xs overflow-auto">
                    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'
                  </pre>
                </li>
                <li>Then run the check-tables.sql script to create a flexible function</li>
                <li>Refresh this page and try again</li>
              </ol>
            </div>
          </div>
        )}
        
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/orders')} 
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon />
          </button>
          <h1 className="text-2xl font-semibold">New Order</h1>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Order Dates</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Date *
                  </label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Printing Date
                  </label>
                  <input
                    type="date"
                    value={printingDate}
                    onChange={(e) => setPrintingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Print Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Number
                </label>
                <input
                  type="text"
                  placeholder="Custom job identifier"
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="Name of the product being printed"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numbering
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sequential, Custom"
                  value={numbering}
                  onChange={(e) => setNumbering(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Pages
                </label>
                <input
                  type="number"
                  min="1"
                  value={numberOfPages}
                  onChange={(e) => setNumberOfPages(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Binding Type
                </label>
                <input
                  type="text"
                  placeholder="e.g., Perfect Binding, Spiral"
                  value={bindingType}
                  onChange={(e) => setBindingType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paper Quality
                </label>
                <input
                  type="text"
                  placeholder="e.g., Glossy, Bond, Art Paper"
                  value={paperQuality}
                  onChange={(e) => setPaperQuality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            ></textarea>
          </div>
          
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <input
                id="includeMaterials"
                type="checkbox"
                checked={includeMaterials}
                onChange={(e) => setIncludeMaterials(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeMaterials" className="ml-2 block text-sm text-gray-900">
                Include materials from inventory
              </label>
            </div>
            
            {includeMaterials && (
              <div className="overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">Order Items</h2>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={item.material_id || ''}
                            onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required={includeMaterials}
                          >
                            <option value="">Select a material</option>
                            {materials.length > 0 ? (
                              materials.map((material) => (
                                <option key={material.id} value={material.id}>
                                  {material.name} ({material.current_stock} {material.unit_of_measure} available)
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>No materials found</option>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required={includeMaterials}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatINR(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatINR(item.quantity * item.unit_price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                            disabled={items.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={addItem}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          + Add Item
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                        Total:
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        {formatINR(calculateTotal())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrder; 