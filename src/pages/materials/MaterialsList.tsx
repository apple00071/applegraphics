import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import BarcodeGenerator from '../../components/BarcodeGenerator';

// Initialize Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_KEY || ''
);

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
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.75h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.75h.75v.75h-.75v-.75z" />
  </svg>
);

interface Material {
  id: string;
  name: string;
  current_stock: number;
  unit_of_measure: string;
  reorder_level: number;
  unit_price: number;
  category_id: string;
  category_name?: string;
  sku?: string;
}

interface Category {
  id: string;
  name: string;
}

// Add this utility function at the top of the file, after imports
// Validates if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Add this sanitization function
const sanitizeUUID = (id: string) => {
  // If it's already a valid UUID, return it
  if (isValidUUID(id)) return id;
  
  // Handle numeric IDs from demo data
  if (/^\d+$/.test(id)) {
    // Convert numeric IDs to a valid UUID format based on the number
    // This is only for demo/test data - real IDs from the database should already be UUIDs
    return `00000000-0000-0000-0000-${id.padStart(12, '0')}`;
  }
  
  return id;
};

const MaterialsList: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Fetching materials from Supabase...');
      
      // Fetch materials from Supabase
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .order('name');
      
      if (materialsError) throw materialsError;
      
      console.log(`✅ Fetched ${materialsData?.length || 0} materials from Supabase`);
      
      // Log first material for debugging if available
      if (materialsData && materialsData.length > 0) {
        console.log('First material structure:', materialsData[0]);
        console.log('First material ID type:', typeof materialsData[0].id);
        console.log('First material ID value:', materialsData[0].id);
      }
      
      // Fetch categories to map category_id to category_name
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');
        
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }
      
      // Create a mapping of category_id to category_name
      const categoryMap = (categoriesData || []).reduce((map, cat) => {
        map[cat.id] = cat.name;
        return map;
      }, {} as Record<string, string>);
      
      if (materialsData && materialsData.length > 0) {
        // Enhance material data with category_name from the mapping
        const enhancedMaterials = materialsData.map(material => ({
          ...material,
          category_name: categoryMap[material.category_id] || 'Unknown Category'
        }));
        
        setMaterials(enhancedMaterials);
      } else {
        console.warn('No materials found in database');
        // Use fallback demo data for empty database
        setMaterials([
          {
            id: "00000000-0000-0000-0000-000000000001", // UUID formatted ID
            name: 'A4 Paper',
            current_stock: 1200,
            unit_of_measure: 'sheets',
            reorder_level: 500,
            unit_price: 0.05,
            category_id: "00000000-0000-0000-0000-000000000001", // UUID formatted ID
            category_name: 'Paper',
            sku: 'PAP-A4-1001'
          },
          {
            id: "00000000-0000-0000-0000-000000000002", // UUID formatted ID
            name: 'Black Ink',
            current_stock: 15,
            unit_of_measure: 'liters',
            reorder_level: 5,
            unit_price: 25.99,
            category_id: "00000000-0000-0000-0000-000000000002", // UUID formatted ID
            category_name: 'Ink',
            sku: 'INK-BLK-2001'
          },
          {
            id: "00000000-0000-0000-0000-000000000003", // UUID formatted ID
            name: 'A3 Paper',
            current_stock: 500,
            unit_of_measure: 'sheets',
            reorder_level: 200,
            unit_price: 0.09,
            category_id: "00000000-0000-0000-0000-000000000001", // UUID formatted ID 
            category_name: 'Paper',
            sku: 'PAP-A3-1002'
          }
        ]);
      }
      
      // After successful fetch, store in localStorage as cache
      try {
        const inventoryData = {
          materials: materialsData || [],
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('inventoryDataCache', JSON.stringify(inventoryData));
        console.log('📦 Cached materials data for offline use');
      } catch (cacheError) {
        console.error('Error caching data:', cacheError);
      }
    } catch (error) {
      console.error('❌ Error fetching materials:', error);
      toast.error('Failed to load materials');
      
      // Fallback to cached data if available
      try {
        const cachedData = localStorage.getItem('inventoryDataCache');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed && parsed.materials && parsed.materials.length > 0) {
            console.log('📦 Using cached materials data');
            setMaterials(parsed.materials);
          }
        }
      } catch (cacheError) {
        console.error('Error reading cached data:', cacheError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    
    // Set up real-time subscription
    const materialsSubscription = supabase
      .channel('materials-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'materials' 
      }, (payload) => {
        console.log('📊 Materials changed:', payload.eventType, payload);
        
        // Need to refetch all materials when there's a change to get the category names
        // This approach ensures we always have up-to-date category information
        fetchMaterials();
      })
      .subscribe();
      
    setRealtimeEnabled(true);
    
    // Cleanup subscription
    return () => {
      supabase.removeChannel(materialsSubscription);
    };
  }, []);

  // Check for any related records before deletion
  const checkRelatedRecords = async (materialId: string) => {
    try {
      console.log(`Checking for related records to material ID: ${materialId}`);
      
      // Check if the material is referenced in order_items
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('id')
        .eq('material_id', materialId);
      
      if (orderItemsError) {
        console.error('Error checking order_items:', orderItemsError);
      } else if (orderItems && orderItems.length > 0) {
        console.log(`Found ${orderItems.length} order items referencing this material`);
        return {
          hasRelatedRecords: true,
          message: `Cannot delete material: it is used in ${orderItems.length} orders`
        };
      }
      
      // Check if the material is referenced in inventory_transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('inventory_transactions')
        .select('id')
        .eq('material_id', materialId);
      
      if (transactionsError) {
        console.error('Error checking inventory_transactions:', transactionsError);
      } else if (transactions && transactions.length > 0) {
        console.log(`Found ${transactions.length} transactions referencing this material`);
        return {
          hasRelatedRecords: true,
          message: `Cannot delete material: it has ${transactions.length} related transactions`
        };
      }
      
      // No related records found
      return { hasRelatedRecords: false };
    } catch (error) {
      console.error('Error checking for related records:', error);
      return { hasRelatedRecords: false }; // Default to allowing deletion if check fails
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        console.log(`🗑️ Attempting to delete material with ID: ${id}`);
        
        // Validate and sanitize UUID
        const sanitizedId = sanitizeUUID(id);
        const isUUID = isValidUUID(sanitizedId);
        
        console.log('Original ID:', id);
        console.log('Sanitized ID:', sanitizedId);
        console.log('Is valid UUID:', isUUID);
        
        if (!isUUID) {
          console.error('The ID is not a valid UUID format');
          toast.error('Invalid material ID format');
          return;
        }
        
        // Check for related records before attempting to delete
        const { hasRelatedRecords, message } = await checkRelatedRecords(sanitizedId);
        if (hasRelatedRecords) {
          toast.error(message || 'Cannot delete: material is referenced by other records');
          return;
        }
        
        // Delete from Supabase using the sanitized ID
        const { error } = await supabase
          .from('materials')
          .delete()
          .eq('id', sanitizedId);
        
        if (error) {
          console.error('Supabase delete error details:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          throw error;
        }
        
        toast.success('Material deleted successfully');
        
        // The UI will be updated automatically by the subscription
      } catch (error) {
        console.error('❌ Error deleting material:', error);
        // Show more detailed error to the user
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to delete material: ${errorMessage}`);
      }
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (material.sku && material.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (currentFilter === 'all') return matchesSearch;
    if (currentFilter === 'low-stock') return matchesSearch && material.current_stock < material.reorder_level;
    if (currentFilter === 'paper') return matchesSearch && material.category_name === 'Paper';
    if (currentFilter === 'ink') return matchesSearch && material.category_name === 'Ink';
    return matchesSearch;
  });

  const generateBarcode = (material: Material) => {
    setSelectedMaterial(material);
    setShowBarcodeGenerator(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Materials Inventory</h1>
        <div className="flex space-x-2">
          <Link
            to="/materials/add"
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            <span className="ml-2">Add Material</span>
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by:
              </label>
              <select
                id="filter"
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentFilter}
                onChange={(e) => setCurrentFilter(e.target.value)}
              >
                <option value="all">All Materials</option>
                <option value="low-stock">Low Stock</option>
                <option value="paper">Paper</option>
                <option value="ink">Ink</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search:
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search materials..."
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <button
              onClick={fetchMaterials}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            {realtimeEnabled && (
              <span className="text-xs text-green-600 mt-1 flex items-center justify-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
                Real-time updates enabled
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMaterials.map(material => (
                  <tr key={material.id} className={material.current_stock < material.reorder_level ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.current_stock} {material.unit_of_measure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.reorder_level} {material.unit_of_measure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${material.unit_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.category_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-3">
                        <button
                          onClick={() => generateBarcode(material)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Generate Barcode"
                        >
                          <QrCodeIcon />
                        </button>
                        <Link
                          to={`/materials/${material.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          to={`/materials/edit/${material.id}`}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Edit"
                        >
                          <PencilIcon />
                        </Link>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="text-red-600 hover:text-red-900"
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
        ) : (
          <div className="p-6 text-center text-gray-500">
            No materials found. Try changing your filter or add some materials.
          </div>
        )}
      </div>

      {showBarcodeGenerator && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="max-w-md w-full mx-4">
            <BarcodeGenerator 
              value={selectedMaterial?.sku || `AG-${selectedMaterial?.id}`}
              materialName={selectedMaterial?.name}
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