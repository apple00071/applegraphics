import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/formatters';
import BarcodeGenerator from '../../components/BarcodeGenerator';

// Custom icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const QrCodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Material {
  id: number;
  name: string;
  current_stock: number;
  unit_of_measure: string;
  reorder_level: number;
  unit_price: number;
  category_id: number;
  category_name?: string;
  sku?: string;
}

const MaterialsList: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      
      // First, check localStorage for materials
      const localMaterials = localStorage.getItem('materials');
      if (localMaterials) {
        const parsedMaterials = JSON.parse(localMaterials);
        if (parsedMaterials && parsedMaterials.length > 0) {
          console.log('Loading materials from localStorage:', parsedMaterials);
          setMaterials(parsedMaterials);
          setIsLoading(false);
          return;
        }
      }
      
      // If no materials in localStorage, try the API
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      // Include the token in the request headers
      const response = await axios.get(`${API_URL}/materials`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setMaterials(response.data);
      
      // Sample data for development as fallback if API fails
      if (!response.data || response.data.length === 0) {
        console.warn('No materials returned from API, using sample data');
        const sampleMaterials = [
          { id: 1, name: 'Matte Paper A4', current_stock: 500, unit_of_measure: 'sheets', reorder_level: 100, unit_price: 0.05, category_id: 1, category_name: 'Paper' },
          { id: 2, name: 'Glossy Paper A3', current_stock: 250, unit_of_measure: 'sheets', reorder_level: 50, unit_price: 0.12, category_id: 1, category_name: 'Paper' },
          { id: 3, name: 'Black Ink', current_stock: 20, unit_of_measure: 'liters', reorder_level: 5, unit_price: 25.00, category_id: 2, category_name: 'Ink' },
          { id: 4, name: 'Cyan Ink', current_stock: 15, unit_of_measure: 'liters', reorder_level: 5, unit_price: 30.00, category_id: 2, category_name: 'Ink' },
          { id: 5, name: 'Magenta Ink', current_stock: 18, unit_of_measure: 'liters', reorder_level: 5, unit_price: 30.00, category_id: 2, category_name: 'Ink' },
          { id: 6, name: 'Yellow Ink', current_stock: 22, unit_of_measure: 'liters', reorder_level: 5, unit_price: 28.00, category_id: 2, category_name: 'Ink' },
          { id: 7, name: 'Binding Wire', current_stock: 30, unit_of_measure: 'rolls', reorder_level: 10, unit_price: 15.00, category_id: 3, category_name: 'Binding' },
          { id: 8, name: 'Offset Plates', current_stock: 40, unit_of_measure: 'pieces', reorder_level: 15, unit_price: 8.00, category_id: 4, category_name: 'Plates' },
        ];
        setMaterials(sampleMaterials);
        // Also save sample data to localStorage if it's empty
        if (!localMaterials) {
          localStorage.setItem('materials', JSON.stringify(sampleMaterials));
        }
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
      
      // Use sample data as fallback
      const sampleMaterials = [
        { id: 1, name: 'Matte Paper A4', current_stock: 500, unit_of_measure: 'sheets', reorder_level: 100, unit_price: 0.05, category_id: 1, category_name: 'Paper' },
        { id: 2, name: 'Glossy Paper A3', current_stock: 250, unit_of_measure: 'sheets', reorder_level: 50, unit_price: 0.12, category_id: 1, category_name: 'Paper' },
        { id: 3, name: 'Black Ink', current_stock: 20, unit_of_measure: 'liters', reorder_level: 5, unit_price: 25.00, category_id: 2, category_name: 'Ink' },
        { id: 4, name: 'Cyan Ink', current_stock: 15, unit_of_measure: 'liters', reorder_level: 5, unit_price: 30.00, category_id: 2, category_name: 'Ink' },
        { id: 5, name: 'Magenta Ink', current_stock: 18, unit_of_measure: 'liters', reorder_level: 5, unit_price: 30.00, category_id: 2, category_name: 'Ink' },
        { id: 6, name: 'Yellow Ink', current_stock: 22, unit_of_measure: 'liters', reorder_level: 5, unit_price: 28.00, category_id: 2, category_name: 'Ink' },
        { id: 7, name: 'Binding Wire', current_stock: 30, unit_of_measure: 'rolls', reorder_level: 10, unit_price: 15.00, category_id: 3, category_name: 'Binding' },
        { id: 8, name: 'Offset Plates', current_stock: 40, unit_of_measure: 'pieces', reorder_level: 15, unit_price: 8.00, category_id: 4, category_name: 'Plates' },
      ];
      setMaterials(sampleMaterials);
      // Also save sample data to localStorage if it's empty
      if (!localStorage.getItem('materials')) {
        localStorage.setItem('materials', JSON.stringify(sampleMaterials));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Add a function to refresh the materials list
  const refreshMaterials = () => {
    fetchMaterials();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        // Remove from localStorage
        const localMaterials = localStorage.getItem('materials');
        if (localMaterials) {
          const parsedMaterials = JSON.parse(localMaterials);
          const updatedMaterials = parsedMaterials.filter((material: Material) => material.id !== id);
          localStorage.setItem('materials', JSON.stringify(updatedMaterials));
        }
        
        // In a real app, this would be an actual API call
        // await axios.delete(`${API_URL}/materials/${id}`);
        setMaterials(materials.filter(material => material.id !== id));
        toast.success('Material deleted successfully');
      } catch (error) {
        console.error('Error deleting material:', error);
        toast.error('Failed to delete material');
      }
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (currentFilter === 'all') return matchesSearch;
    if (currentFilter === 'low-stock') return matchesSearch && material.current_stock <= material.reorder_level;
    if (currentFilter === 'paper') return matchesSearch && material.category_name === 'Paper';
    if (currentFilter === 'ink') return matchesSearch && material.category_name === 'Ink';
    
    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold">Materials Inventory</h1>
        <Link 
          to="/materials/add" 
          className="mt-3 sm:mt-0 flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon />
          <span className="ml-2">Add Material</span>
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          {/* Search input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search materials..."
              className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('all')}
            >
              All
            </button>
            <button 
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'low-stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('low-stock')}
            >
              Low Stock
            </button>
            <button 
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'paper' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('paper')}
            >
              Paper
            </button>
            <button 
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'ink' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('ink')}
            >
              Ink
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <>
            {filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No materials found matching your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reorder Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMaterials.map(material => (
                      <tr key={material.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link to={`/materials/${material.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {material.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {material.category_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            material.current_stock <= material.reorder_level 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {material.current_stock} {material.unit_of_measure}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {material.reorder_level} {material.unit_of_measure}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {formatINR(material.unit_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={() => {
                                setSelectedMaterial(material);
                                setShowBarcodeGenerator(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              aria-label="Generate Barcode"
                              title="Generate Barcode"
                            >
                              <QrCodeIcon />
                            </button>
                            <Link
                              to={`/materials/edit/${material.id}`}
                              className="text-yellow-600 hover:text-yellow-900"
                              aria-label="Edit"
                              title="Edit"
                            >
                              <PencilIcon />
                            </Link>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="text-red-600 hover:text-red-900"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Barcode Generator Modal */}
      {showBarcodeGenerator && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md w-full mx-4">
            <BarcodeGenerator 
              value={selectedMaterial.sku ? `AG${selectedMaterial.sku.replace(/^AG/, '')}` : `AG-${selectedMaterial.id}`}
              materialName={selectedMaterial.name}
              onClose={() => {
                setShowBarcodeGenerator(false);
                setSelectedMaterial(null);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsList; 