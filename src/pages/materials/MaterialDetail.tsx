import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatINR } from '../../utils/formatters';
import BarcodeGenerator from '../../components/BarcodeGenerator';

// Basic Material interface with minimum required properties
interface Material {
  id: string;
  name: string;
  sku: string;
  description?: string;
  current_stock: number;
  unit_of_measure: string;
  reorder_level?: number;
  unit_price?: number;
  location?: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
}

// Basic Transaction history interface
interface TransactionHistory {
  id: number;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  notes?: string;
  user_name?: string;
}

const MaterialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Debug logging for the ID parameter
  console.log('MaterialDetail - Received ID param:', id);
  console.log('MaterialDetail - ID param type:', typeof id);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setErrorMessage('No material ID provided');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('Attempting to fetch material with ID:', id);
        
        // ULTRA-SIMPLE QUERY - absolutely no joins or relationships
        // Just get the bare material by ID
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
        
        // Immediately set the material with basic data, no relationships needed
        const simpleMaterial: Material = {
          id: data.id,
          name: data.name || 'Unnamed Material',
          sku: data.sku || 'No SKU',
          description: data.description || '',
          current_stock: data.current_stock || 0,
          unit_of_measure: data.unit_of_measure || 'units',
          reorder_level: data.reorder_level,
          unit_price: data.unit_price,
          location: data.location,
          category_id: data.category_id,
          category_name: 'Loading...', // Default value before we look up the actual name
          supplier_id: data.supplier_id,
          supplier_name: 'Loading...'   // Default value before we look up the actual name
        };
        
        // Set the material immediately for fast loading
        setMaterial(simpleMaterial);
        
        // Try to get category info in a separate, non-blocking query
        if (data.category_id) {
          supabase
            .from('categories')
            .select('name')
            .eq('id', data.category_id)
            .single()
            .then(({ data: categoryData, error: categoryError }) => {
              if (!categoryError && categoryData && categoryData.name) {
                // Update just the category name
                setMaterial(prev => prev ? {
                  ...prev,
                  category_name: categoryData.name
                } : null);
              } else {
                console.error('Could not load category name:', categoryError);
                // Set a default if there's an error
                setMaterial(prev => prev ? {
                  ...prev,
                  category_name: 'Unknown Category'
                } : null);
              }
            });
        } else {
          // No category_id, so set a default
          setMaterial(prev => prev ? {
            ...prev,
            category_name: 'No Category'
          } : null);
        }
        
        // Try to get supplier info in a separate, non-blocking query
        if (data.supplier_id) {
          supabase
            .from('suppliers')
            .select('name')
            .eq('id', data.supplier_id)
            .single()
            .then(({ data: supplierData, error: supplierError }) => {
              if (!supplierError && supplierData && supplierData.name) {
                // Update just the supplier name
                setMaterial(prev => prev ? {
                  ...prev,
                  supplier_name: supplierData.name
                } : null);
              } else {
                console.error('Could not load supplier name:', supplierError);
                // Set a default if there's an error
                setMaterial(prev => prev ? {
                  ...prev,
                  supplier_name: 'Unknown Supplier'
                } : null);
              }
            });
        } else {
          // No supplier_id, so set a default
          setMaterial(prev => prev ? {
            ...prev,
            supplier_name: 'No Supplier'
          } : null);
        }

        // Fetch transactions separately
        try {
          setIsLoadingTransactions(true);
          
          const { data: txData, error: txError } = await supabase
            .from('inventory_transactions')
            .select('*')
            .eq('material_id', id)
            .order('transaction_date', { ascending: false });
          
          if (txError) {
            console.error('Error fetching transactions:', txError);
            setTransactions([]);
          } else if (txData && txData.length > 0) {
            // Basic transaction data without complex relationships
            const simpleTransactions: TransactionHistory[] = txData.map(tx => ({
              id: tx.id,
              transaction_type: tx.transaction_type || 'unknown',
              quantity: tx.quantity || 0,
              transaction_date: tx.transaction_date || new Date().toISOString(),
              notes: tx.notes || '',
              user_name: 'System User' // Simplified, no lookup
            }));
            
            setTransactions(simpleTransactions);
          } else {
            setTransactions([]);
          }
        } catch (txErr) {
          console.error('Error processing transactions:', txErr);
          setTransactions([]);
        } finally {
          setIsLoadingTransactions(false);
        }
        
      } catch (error: any) {
        console.error('Error in fetchData:', error);
        setErrorMessage('Failed to load material details: ' + (error.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="p-4 flex flex-col items-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
        
        <div className="text-center mt-4 text-red-600 text-2xl">
          Material not found
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

  // No material data
  if (!material) {
    return (
      <div className="p-4 flex flex-col items-center">
        <div className="text-center text-red-600 text-2xl">
          No material data available
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

  // Render material details
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-2xl font-bold">Material Detail</h1>
          <div className="flex space-x-2">
            <Link
              to={`/qr-generator/${material.sku}`}
              className="bg-blue-500 text-white p-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Generate Barcode
            </Link>
            <Link
              to={`/materials/edit/${material.id}`}
              className="bg-yellow-500 text-white p-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">General Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-lg">{material.name}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">SKU</span>
              <span className="font-medium">{material.sku}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Category</span>
              <span className="font-medium">{material.category_name || 'Not categorized'}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Description</span>
              <span className="font-medium">{material.description || 'No description'}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Supplier</span>
              <span className="font-medium">{material.supplier_name || 'Not specified'}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Location</span>
              <span className="font-medium">{material.location || 'Not specified'}</span>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Inventory Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col">
              <span className="text-gray-500">Current Stock</span>
              <span className="font-medium text-lg">
                {material.current_stock} {material.unit_of_measure}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Reorder Level</span>
              <span className="font-medium">
                {material.reorder_level || 0} {material.unit_of_measure}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Unit Price</span>
              <span className="font-medium">
                {material.unit_price ? formatINR(material.unit_price) : 'Not set'} per {material.unit_of_measure}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-gray-500">Stock Value</span>
              <span className="font-medium">
                {material.unit_price ? formatINR(material.unit_price * material.current_stock) : 'Not available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Transaction History</h2>
        </div>
        
        <div className="p-4">
          {isLoadingTransactions ? (
            <div className="text-center p-4">
              <div className="animate-spin inline-block rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
              <p className="mt-2">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        transaction.transaction_type === 'purchase' ? 'text-green-600' :
                        transaction.transaction_type === 'usage' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {material.unit_of_measure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.user_name || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-4 text-gray-500">
              No transaction history available
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between">
        <Link 
          to="/materials" 
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
        >
          Back to Materials List
        </Link>
      </div>
    </div>
  );
};

export default MaterialDetail; 