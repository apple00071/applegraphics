import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Custom icon component
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

interface MaterialData {
  name: string;
  description: string;
  sku: string;
  category_id: string;
  unit_of_measure: string;
  current_stock: string;
  reorder_level: string;
  unit_price: string;
  supplier_id: string;
  location: string;
}

const EditMaterial: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MaterialData>({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    unit_of_measure: '',
    current_stock: '',
    reorder_level: '',
    unit_price: '',
    supplier_id: '',
    location: ''
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!id) {
        setErrorMessage('No material ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Attempting to fetch material with ID:', id);
        
        // Simple query with no relationships - just get the material
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching material:', error);
          setErrorMessage(`Error loading material: ${error.message}`);
          setIsLoading(false);
          return;
        }
        
        if (!data) {
          console.error('Material not found');
          setErrorMessage('Material not found');
          setIsLoading(false);
          return;
        }
        
        console.log('Material data successfully retrieved:', data);
        
        // Set form data from material data
        setFormData({
          name: data.name || '',
          description: data.description || '',
          sku: data.sku || '',
          category_id: data.category_id || '',
          unit_of_measure: data.unit_of_measure || '',
          current_stock: data.current_stock ? data.current_stock.toString() : '0',
          reorder_level: data.reorder_level ? data.reorder_level.toString() : '0',
          unit_price: data.unit_price ? data.unit_price.toString() : '0',
          supplier_id: data.supplier_id || '',
          location: data.location || ''
        });
        
        // Fetch categories and suppliers separately
        await Promise.all([fetchCategories(), fetchSuppliers()]);
      } catch (error: any) {
        console.error('Error in fetchMaterial:', error);
        setErrorMessage('Failed to load material details: ' + (error.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMaterial();
  }, [id, navigate]);

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      
      // Simple query for categories
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error);
        toast.error(`Error loading categories: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No categories found');
        setCategories([]);
        return;
      }
      
      console.log('Categories loaded:', data);
      setCategories(data);
    } catch (error: any) {
      console.error('Error in fetchCategories:', error);
      toast.error('Failed to load categories: ' + (error.message || 'Unknown error'));
    }
  };

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      
      // Simple query for suppliers
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching suppliers:', error);
        toast.error(`Error loading suppliers: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No suppliers found');
        setSuppliers([]);
        return;
      }
      
      console.log('Suppliers loaded:', data);
      setSuppliers(data);
    } catch (error: any) {
      console.error('Error in fetchSuppliers:', error);
      toast.error('Failed to load suppliers: ' + (error.message || 'Unknown error'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Material name is required');
      return;
    }
    
    if (!formData.sku.trim()) {
      toast.error('SKU is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare data for submission
      const updateData = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        category_id: formData.category_id || null,
        unit_of_measure: formData.unit_of_measure,
        current_stock: parseFloat(formData.current_stock) || 0,
        reorder_level: parseFloat(formData.reorder_level) || 0,
        unit_price: parseFloat(formData.unit_price) || 0,
        supplier_id: formData.supplier_id || null,
        location: formData.location,
        updated_at: new Date().toISOString()
      };
      
      console.log('Updating material with data:', updateData);
      
      // Update in Supabase
      const { data, error } = await supabase
        .from('materials')
        .update(updateData)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error updating material:', error);
        toast.error(`Error updating material: ${error.message}`);
        return;
      }
      
      console.log('Material updated successfully:', data);
      toast.success('Material updated successfully');
      
      // Navigate back to material detail page
      navigate(`/materials/${id}`);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error('Failed to update material: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSKU = () => {
    if (!formData.name || !formData.category_id) {
      toast.error('Name and category are required to generate SKU');
      return;
    }
    
    // Find the category name
    const category = categories.find(cat => cat.id === formData.category_id);
    if (!category) {
      toast.error('Selected category not found');
      return;
    }
    
    // Get the first 3 letters of category and material name
    const categoryPrefix = category.name.substring(0, 3).toUpperCase();
    const namePrefix = formData.name.substring(0, 3).toUpperCase();
    
    // Add a timestamp for uniqueness (last 6 digits)
    const timestamp = Date.now().toString().slice(-6);
    
    // Add two random digits for extra uniqueness
    const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    // Combine to create the SKU
    const sku = `AG-${categoryPrefix}-${namePrefix}-${timestamp}${randomDigits}`;
    
    setFormData(prev => ({ ...prev, sku }));
    toast.success('SKU generated');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }
  
  if (errorMessage) {
    return (
      <div className="p-4 flex flex-col items-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
        
        <div className="text-center mt-4 text-red-600 text-2xl">
          Cannot edit material
        </div>
        
        <button 
          onClick={() => navigate('/materials')}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Materials List
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link to={`/materials/${id}`} className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon />
          <span className="ml-1">Back to Material Details</span>
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Edit Material</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Material Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sku">
                SKU*
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r"
                >
                  Generate
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category_id">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={4}
              />
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="current_stock">
                Current Stock
              </label>
              <input
                type="number"
                id="current_stock"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit_of_measure">
                Unit of Measure
              </label>
              <input
                type="text"
                id="unit_of_measure"
                name="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={handleChange}
                placeholder="e.g., sheets, liters, kg"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="reorder_level">
                Reorder Level
              </label>
              <input
                type="number"
                id="reorder_level"
                name="reorder_level"
                value={formData.reorder_level}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit_price">
                Unit Price
              </label>
              <input
                type="number"
                id="unit_price"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="supplier_id">
                Supplier
              </label>
              <select
                id="supplier_id"
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select a supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
                Storage Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Shelf A3, Warehouse B"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => navigate(`/materials/${id}`)}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditMaterial; 