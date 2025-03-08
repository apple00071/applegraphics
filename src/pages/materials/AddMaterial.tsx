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
    location: ''
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
    
    // Validate form
    if (!formData.name || !formData.sku || !formData.category_id || !formData.supplier_id) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('📝 Creating new material in Supabase...');
      
      // First check if the SKU already exists
      console.log('Checking if SKU already exists:', formData.sku);
      const { data: existingMaterials, error: checkError } = await supabase
        .from('materials')
        .select('id')
        .eq('sku', formData.sku);
      
      if (checkError) {
        console.error('Error checking for existing SKU:', checkError);
        throw checkError;
      }
      
      if (existingMaterials && existingMaterials.length > 0) {
        console.error('SKU already exists:', formData.sku);
        toast.error(`A material with SKU "${formData.sku}" already exists. Please use a different SKU.`);
        setIsSubmitting(false);
        return;
      }
      
      // Convert category_id and supplier_id to valid UUID format if necessary
      const categoryId = ensureUUID(formData.category_id);
      const supplierId = ensureUUID(formData.supplier_id);
      
      // Validate UUIDs
      if (!isValidUUID(categoryId)) {
        throw new Error(`Invalid UUID format for category ID: ${formData.category_id}`);
      }
      
      if (!isValidUUID(supplierId)) {
        throw new Error(`Invalid UUID format for supplier ID: ${formData.supplier_id}`);
      }
      
      // Log UUID conversions for debugging
      console.log('Original category_id:', formData.category_id);
      console.log('Converted category_id:', categoryId);
      console.log('Original supplier_id:', formData.supplier_id);
      console.log('Converted supplier_id:', supplierId);
      
      // Prepare the material data with valid UUIDs
      const materialData = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        category_id: categoryId,
        supplier_id: supplierId,
        current_stock: parseInt(formData.current_stock),
        reorder_level: parseInt(formData.reorder_level),
        unit_price: parseFloat(formData.unit_price),
        unit_of_measure: formData.unit_of_measure,
        location: formData.location
      };
      
      // Log the data being sent to Supabase for debugging
      console.log('Material data being sent:', materialData);
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('materials')
        .insert([materialData])
        .select();
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      console.log('✅ Material created successfully:', data);
      toast.success('Material added successfully');
      navigate('/materials');
    } catch (error) {
      console.error('❌ Error creating material:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to add material: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSKU = () => {
    // Only generate if category and name are provided
    const category = categories.find(c => c.id === formData.category_id);
    if (!category || !formData.name) return;
    
    // Create a SKU based on AG prefix, category name and material name
    const categoryPrefix = category.name.substring(0, 3).toUpperCase();
    const materialPart = formData.name
      .replace(/[^a-zA-Z0-9]/g, '')  // Remove special characters
      .substring(0, 3)
      .toUpperCase();
    
    // Use a timestamp to make it more unique
    const timestamp = new Date().getTime();
    const shortTimestamp = timestamp.toString().substring(timestamp.toString().length - 4);
    
    // Add 2 random digits (will give us 6 digits total for the numerical part)
    const randomDigits = Math.floor(10 + Math.random() * 90);
    
    const sku = `AG-${categoryPrefix}-${materialPart}-${shortTimestamp}${randomDigits}`;
    setFormData(prev => ({ ...prev, sku }));
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
              onBlur={generateSKU}
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
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              onBlur={generateSKU}
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