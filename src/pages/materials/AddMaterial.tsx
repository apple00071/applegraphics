import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// Custom icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Category {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
}

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
    unit_of_measure: 'sheets',
    current_stock: '0',
    reorder_level: '0',
    unit_price: '0',
    supplier_id: '',
    location: ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // For a real app, use actual API calls
        // const response = await axios.get(`${API_URL}/categories`);
        // setCategories(response.data);
        
        // Sample data for development
        setCategories([
          { id: 1, name: 'Paper' },
          { id: 2, name: 'Ink' },
          { id: 3, name: 'Binding' },
          { id: 4, name: 'Plates' },
          { id: 5, name: 'Other' }
        ]);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };

    const fetchSuppliers = async () => {
      try {
        // For a real app, use actual API calls
        // const response = await axios.get(`${API_URL}/suppliers`);
        // setSuppliers(response.data);
        
        // Sample data for development
        setSuppliers([
          { id: 1, name: 'Paper Supplies Inc' },
          { id: 2, name: 'Ink Masters' },
          { id: 3, name: 'Binding Solutions' },
          { id: 4, name: 'Plate Pros' }
        ]);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.error('Failed to load suppliers');
      }
    };

    fetchCategories();
    fetchSuppliers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name || !formData.sku || !formData.category_id || !formData.supplier_id) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get the authentication token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      // Create a new material object with proper type conversions
      const newMaterial = {
        id: Date.now(), // Use timestamp as temporary ID
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        category_id: parseInt(formData.category_id),
        category_name: categories.find(c => c.id.toString() === formData.category_id)?.name || '',
        unit_of_measure: formData.unit_of_measure,
        current_stock: parseFloat(formData.current_stock),
        reorder_level: parseInt(formData.reorder_level),
        unit_price: parseFloat(formData.unit_price),
        supplier_id: parseInt(formData.supplier_id),
        supplier_name: suppliers.find(s => s.id.toString() === formData.supplier_id)?.name || '',
        location: formData.location
      };
      
      // Save to localStorage
      const existingMaterials = JSON.parse(localStorage.getItem('materials') || '[]');
      existingMaterials.push(newMaterial);
      localStorage.setItem('materials', JSON.stringify(existingMaterials));
      
      // For a real app, use actual API calls with auth token
      // await axios.post(`${API_URL}/materials`, {
      //   ...formData,
      //   current_stock: parseFloat(formData.current_stock),
      //   reorder_level: parseInt(formData.reorder_level),
      //   unit_price: parseFloat(formData.unit_price),
      //   category_id: parseInt(formData.category_id),
      //   supplier_id: parseInt(formData.supplier_id)
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Material added successfully');
      navigate('/materials');
      
      // Reset form data if needed
      setFormData({
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
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error('Failed to add material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateSKU = () => {
    const category = categories.find(c => c.id.toString() === formData.category_id);
    if (!category || !formData.name) return;
    
    // Create a SKU based on AG prefix, category name and material name
    const categoryPrefix = category.name.substring(0, 3).toUpperCase();
    const materialPart = formData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const sku = `AG-${categoryPrefix}-${materialPart}-${randomNum}`;
    
    setFormData(prevData => ({
      ...prevData,
      sku
    }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link to="/materials" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-2xl font-bold">Add New Material</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  required
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="bg-gray-200 px-3 py-2 rounded-r-md hover:bg-gray-300 transition-colors"
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
                required
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                required
                value={formData.supplier_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                Initial Stock
              </label>
              <input
                type="number"
                name="current_stock"
                min="0"
                step="1"
                value={formData.current_stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sheets">Sheets</option>
                <option value="rolls">Rolls</option>
                <option value="liters">Liters</option>
                <option value="kilograms">Kilograms</option>
                <option value="pieces">Pieces</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                name="reorder_level"
                min="0"
                step="1"
                value={formData.reorder_level}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price (₹)
              </label>
              <input
                type="number"
                name="unit_price"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end space-x-3">
            <Link 
              to="/materials" 
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {isSubmitting ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial; 