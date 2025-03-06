import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// Custom icon component
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

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setIsLoading(true);
        
        // First check if material exists in localStorage
        const localMaterials = localStorage.getItem('materials');
        if (localMaterials) {
          const parsedMaterials = JSON.parse(localMaterials);
          const material = parsedMaterials.find((m: any) => m.id.toString() === id);
          
          if (material) {
            // Convert the material data to the format expected by the form
            setFormData({
              name: material.name || '',
              description: material.description || '',
              sku: material.sku || '',
              category_id: material.category_id ? material.category_id.toString() : '',
              unit_of_measure: material.unit_of_measure || '',
              current_stock: material.current_stock ? material.current_stock.toString() : '0',
              reorder_level: material.reorder_level ? material.reorder_level.toString() : '0',
              unit_price: material.unit_price ? material.unit_price.toString() : '0',
              supplier_id: material.supplier_id ? material.supplier_id.toString() : '',
              location: material.location || ''
            });
          } else {
            toast.error('Material not found');
            navigate('/materials');
            return;
          }
        } else {
          // Try fetching from API if not in localStorage
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('No authentication token found');
            toast.error('Authentication error. Please log in again.');
            return;
          }
          
          const response = await axios.get(`${API_URL}/materials/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const material = response.data;
          
          setFormData({
            name: material.name || '',
            description: material.description || '',
            sku: material.sku || '',
            category_id: material.category_id ? material.category_id.toString() : '',
            unit_of_measure: material.unit_of_measure || '',
            current_stock: material.current_stock ? material.current_stock.toString() : '0',
            reorder_level: material.reorder_level ? material.reorder_level.toString() : '0',
            unit_price: material.unit_price ? material.unit_price.toString() : '0',
            supplier_id: material.supplier_id ? material.supplier_id.toString() : '',
            location: material.location || ''
          });
        }

        // Fetch categories and suppliers
        await Promise.all([fetchCategories(), fetchSuppliers()]);
      } catch (error) {
        console.error('Error fetching material:', error);
        toast.error('Failed to load material');
        navigate('/materials');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMaterial();
  }, [id, navigate]);

  const fetchCategories = async () => {
    try {
      // In a real app, use API call
      // const response = await axios.get(`${API_URL}/categories`);
      // setCategories(response.data);
      
      // Sample data for development
      setCategories([
        { id: 1, name: 'Paper' },
        { id: 2, name: 'Ink' },
        { id: 3, name: 'Binding' },
        { id: 4, name: 'Plates' },
        { id: 5, name: 'Miscellaneous' }
      ]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchSuppliers = async () => {
    try {
      // In a real app, use API call
      // const response = await axios.get(`${API_URL}/suppliers`);
      // setSuppliers(response.data);
      
      // Sample data for development
      setSuppliers([
        { id: 1, name: 'PaperCo Ltd' },
        { id: 2, name: 'Ink Suppliers Inc' },
        { id: 3, name: 'Binding Solutions' },
        { id: 4, name: 'Print Equipment Ltd' },
        { id: 5, name: 'Wholesale Materials Co' }
      ]);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

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
      
      // Update the material in localStorage
      const localMaterials = localStorage.getItem('materials');
      if (localMaterials) {
        const parsedMaterials = JSON.parse(localMaterials);
        
        // Find the material to update
        const updatedMaterials = parsedMaterials.map((material: any) => {
          if (material.id.toString() === id) {
            // Create updated material with proper type conversions
            return {
              ...material,
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
          }
          return material;
        });
        
        localStorage.setItem('materials', JSON.stringify(updatedMaterials));
      }
      
      // For a real app, use actual API calls with auth token
      // await axios.put(`${API_URL}/materials/${id}`, {
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
      
      toast.success('Material updated successfully');
      navigate('/materials');
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Failed to update material');
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/materials')} 
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="text-2xl font-bold">Edit Material</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">General Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={generateSKU}
                        className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-4">Inventory Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      name="current_stock"
                      value={formData.current_stock}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit of Measure *
                    </label>
                    <select
                      name="unit_of_measure"
                      value={formData.unit_of_measure}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a unit</option>
                      <option value="sheets">Sheets</option>
                      <option value="reams">Reams</option>
                      <option value="rolls">Rolls</option>
                      <option value="liters">Liters</option>
                      <option value="kg">Kilograms</option>
                      <option value="pieces">Pieces</option>
                      <option value="boxes">Boxes</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level *
                    </label>
                    <input
                      type="number"
                      name="reorder_level"
                      value={formData.reorder_level}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="unit_price"
                      value={formData.unit_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/materials')}
              className="mr-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial; 