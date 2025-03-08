import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Custom icon component
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

interface Material {
  id: number;
  name: string;
  current_stock: number;
  unit_price: number;
  unit_of_measure: string;
}

interface OrderItem {
  material_id: number;
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
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { material_id: 0, quantity: 1, unit_price: 0 }
  ]);

  // Fetch data
  useEffect(() => {
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
          setMaterials(materialsResponse.data || []);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Update item details
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    
    if (field === 'material_id') {
      const material = materials.find(m => m.id === parseInt(value));
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
    setItems([...items, { material_id: 0, quantity: 1, unit_price: 0 }]);
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
    return items.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0);
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
    
    if (items.some(item => item.material_id === 0)) {
      toast.error('Please select materials for all items');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // In a real app, you would submit to your API
      // const response = await axios.post(`${API_URL}/orders`, {
      //   customer_name: customerName,
      //   customer_contact: customerContact,
      //   customer_email: customerEmail,
      //   required_date: requiredDate,
      //   notes,
      //   items
      // });
      
      // For demo purposes, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Order created successfully');
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6">
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
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
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
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="overflow-x-auto mb-6">
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
                        required
                      >
                        <option value="">Select a material</option>
                        {materials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.current_stock} {material.unit_of_measure} available)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
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