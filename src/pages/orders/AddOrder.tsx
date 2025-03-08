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
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  message: string;
}

// Helper function to insert order directly using SQL - bypasses schema cache issues
const createOrderDirectly = async (orderData: OrderData): Promise<OrderResult> => {
  try {
    // This uses a raw SQL query which bypasses the schema cache entirely
    const { data, error } = await supabase.rpc('direct_insert_order', {
      customer_name_param: orderData.customerName,
      order_date_param: orderData.orderDate,
      required_date_param: orderData.requiredDate,
      status_param: orderData.status,
      notes_param: orderData.notes,
      total_amount_param: orderData.totalAmount
    });
    
    if (error) {
      console.error("Direct SQL insert failed:", error);
      
      // Fall back to localStorage if SQL fails
      const existingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
      const tempOrder = {
        id: `temp-${Date.now()}`,
        ...orderData,
        createdAt: new Date().toISOString()
      };
      existingOrders.push(tempOrder);
      localStorage.setItem('pendingOrders', JSON.stringify(existingOrders));
      
      return { success: true, orderId: tempOrder.id, message: "Order saved locally due to database error" };
    }
    
    return { success: true, orderId: data, message: "Order created successfully" };
  } catch (error: unknown) {
    console.error("Error in direct SQL approach:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, message: errorMessage };
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

// Initialize SQL function to bypass schema cache issues
const initializeOrderFunction = async () => {
  try {
    // Check if the function already exists
    const { data, error } = await supabase.rpc('function_exists', { function_name: 'insert_order' });
    
    // If the function doesn't exist or there was an error checking, try to create it
    if (error || !data) {
      console.log('Creating SQL function for orders...');
      await supabase.rpc('create_order_function');
    }
  } catch (error) {
    console.error('Error initializing order function:', error);
    // Silently fail - we'll fall back to direct inserts
  }
};

const AddOrder: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Fetch data and initialize function
  useEffect(() => {
    const setupAndFetchData = async () => {
      // Try to initialize our helper function
      await initializeOrderFunction();
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
        totalAmount
      });
      
      if (!result.success) {
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
        
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);
        
        if (itemsError) {
          console.error('Error creating order items:', itemsError);
          toast.error(`Order created but items failed: ${itemsError.message}`);
          return;
        }
        
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
        {hasSchemaCacheError && (
          <div className="mb-6 p-4 border border-yellow-300 bg-yellow-50 rounded-md">
            <h3 className="font-semibold text-yellow-800">Database Schema Cache Error</h3>
            <p className="text-yellow-700 mb-2">
              There appears to be a schema cache issue with the database. This can happen when the database structure has been updated but the cache hasn't refreshed.
            </p>
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={handleManualSubmit}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Save Order Locally
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Refresh Page
              </button>
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