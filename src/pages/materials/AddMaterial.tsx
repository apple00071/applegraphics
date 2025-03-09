import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Initialize Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_KEY || ''
);

// Custom icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

// Add these utility functions after imports and before component definition
// Validates if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Convert numeric IDs to proper UUID format
const ensureUUID = (id: string) => {
  // If it's already a valid UUID, return it
  if (isValidUUID(id)) return id;
  
  // Handle numeric IDs by converting to UUID format
  if (/^\d+$/.test(id)) {
    return `00000000-0000-0000-0000-${id.padStart(12, '0')}`;
  }
  
  return id;
};

const AddMaterial: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    supplier_id: '',
    current_stock: '0',
    reorder_level: '0',
    unit_price: '0',
    unit_of_measure: 'sheets',
    location: '',
    model_number: '',
    empty_card_price: '0',
    offset_printing_price: '0',
    multi_color_price: '0'
  });

  useEffect(() => {
    // Fetch categories and suppliers when component mounts
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      console.log('📊 Fetching categories from Supabase...');
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // No fallback data, just show what we got
        console.warn('No categories found in database');
        setCategories([]);
        toast.error('No categories found. Please add categories first.');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      console.log('📊 Fetching suppliers from Supabase...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSuppliers(data);
      } else {
        // No fallback data, just show what we got
        console.warn('No suppliers found in database');
        setSuppliers([]);
        toast.error('No suppliers found. Please add suppliers first.');
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
      setSuppliers([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.name || !formData.category_id || !formData.supplier_id || !formData.model_number) {
        toast.error('Please fill in all required fields (name, category, supplier, model number)');
        return;
      }
      
      // Validate SKU format
      if (formData.sku) {
        const skuRegex = /^AG_[A-Z]{3}_[A-Z0-9]{1,3}_\d{6}$/;
        if (!skuRegex.test(formData.sku)) {
          toast.error('SKU format is incorrect. It should be in format: AG_SUP_MOD_XXYYZZ');
          return;
        }
      } else {
        // Generate SKU if not provided
        generateSKU();
        if (!formData.sku) {
          toast.error('Could not generate SKU. Please check required fields or enter SKU manually.');
          return;
        }
      }
      
      console.log('Material data being sent:', formData);
      
      // Add the material to Supabase
      const { data, error } = await supabase
        .from('materials')
        .insert({
          name: formData.name,
          description: formData.description,
          sku: formData.sku,
          category_id: formData.category_id,
          supplier_id: formData.supplier_id,
          current_stock: parseFloat(formData.current_stock) || 0,
          reorder_level: parseInt(formData.reorder_level) || 0,
          unit_price: parseFloat(formData.unit_price) || 0,
          unit_of_measure: formData.unit_of_measure,
          location: formData.location,
          model_number: formData.model_number,
          empty_card_price: parseFloat(formData.empty_card_price) || 0,
          offset_printing_price: parseFloat(formData.offset_printing_price) || 0,
          multi_color_price: parseFloat(formData.multi_color_price) || 0
        })
        .select('*');
      
      if (error) {
        // Check for specific error types and provide helpful messages
        if (error.code === '23503') {
          // Foreign key constraint violation
          if (error.message.includes('category_id')) {
            console.error('Supabase error details:', error);
            toast.error('The selected category does not exist in the database. Please check the database schema or select a different category.');
          } else if (error.message.includes('supplier_id')) {
            console.error('Supabase error details:', error);
            toast.error('The selected supplier does not exist in the database. Please select a different supplier.');
          } else {
            console.error('Supabase error details:', error);
            toast.error(`Foreign key constraint error: ${error.message}`);
          }
        } else if (error.code === '23505') {
          // Unique constraint violation (duplicate SKU)
          console.error('Supabase error details:', error);
          toast.error('A material with this SKU already exists. Please use a different SKU or generate a new one.');
          
          // Generate a new SKU to help the user
          generateSKU();
        } else {
          console.error('❌ Error creating material:', error);
          toast.error(`Error creating material: ${error.message}`);
        }
        return;
      }
      
      // Clear the form after successful submission
      setFormData({
        name: '',
        description: '',
        sku: '',
        category_id: '',
        supplier_id: '',
        current_stock: '0',
        reorder_level: '0',
        unit_price: '0',
        unit_of_measure: 'piece',
        location: '',
        model_number: '',
        empty_card_price: '0',
        offset_printing_price: '0',
        multi_color_price: '0'
      });
      
      toast.success('Material added successfully!');
      navigate('/materials');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred. Please try again later.');
    }
  };

  const generateSKU = () => {
    // Get supplier information
    const supplier = suppliers.find(s => s.id === formData.supplier_id);
    if (!supplier || !formData.model_number) {
      toast.error('Supplier and Model Number are required to generate SKU');
      return;
    }
    
    // Extract first 3 characters of supplier name (uppercase)
    const supplierCode = supplier.name.substring(0, 3).toUpperCase();
    
    // Extract model number (up to 3 characters)
    const modelCode = formData.model_number.substring(0, 3).toUpperCase();
    
    // Format prices (ensure they're two digits)
    const emptyCardPrice = Math.floor(parseFloat(formData.empty_card_price) || 0)
      .toString().padStart(2, '0').substring(0, 2);
    const offsetPrintingPrice = Math.floor(parseFloat(formData.offset_printing_price) || 0)
      .toString().padStart(2, '0').substring(0, 2);
    const multiColorPrice = Math.floor(parseFloat(formData.multi_color_price) || 0)
      .toString().padStart(2, '0').substring(0, 2);
    
    // Combine prices
    const priceCode = `${emptyCardPrice}${offsetPrintingPrice}${multiColorPrice}`;
    
    // Format final SKU: AG_SUP_MOD_XXXXXX
    const sku = `AG_${supplierCode}_${modelCode}_${priceCode}`;
    
    setFormData(prev => ({ ...prev, sku }));
    toast.success('SKU generated based on specified format');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Material</h1>
        <button
          onClick={() => navigate('/materials')}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={generateSKU}
                className="px-4 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Format: AG_SUP_MOD_XXYYZZ where SUP=Supplier, MOD=Model, XX=Empty Card Price, YY=Offset Printing Price, ZZ=Multi-Color Price</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="model_number"
              value={formData.model_number}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Stock
            </label>
            <input
              type="number"
              name="current_stock"
              value={formData.current_stock}
              onChange={handleChange}
              min="0"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level
            </label>
            <input
              type="number"
              name="reorder_level"
              value={formData.reorder_level}
              onChange={handleChange}
              min="0"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price
            </label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empty Card Price
              </label>
              <input
                type="number"
                name="empty_card_price"
                value={formData.empty_card_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offset Printing Price
              </label>
              <input
                type="number"
                name="offset_printing_price"
                value={formData.offset_printing_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Multi-Color Price
              </label>
              <input
                type="number"
                name="multi_color_price"
                value={formData.multi_color_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit of Measure
            </label>
            <select
              name="unit_of_measure"
              value={formData.unit_of_measure}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sheets">Sheets</option>
              <option value="reams">Reams</option>
              <option value="boxes">Boxes</option>
              <option value="rolls">Rolls</option>
              <option value="liters">Liters</option>
              <option value="kilograms">Kilograms</option>
              <option value="units">Units</option>
              <option value="pieces">Pieces</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Material'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMaterial; 