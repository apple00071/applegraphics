import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import BarcodeScanner from '../../components/BarcodeScanner';
import BarcodeGenerator from '../../components/BarcodeGenerator';
import { formatINR, formatDateToIST } from '../../utils/formatters';

// Custom icon components
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const QrCodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);

// API URL from environment
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Material {
  id: number;
  name: string;
  description: string;
  sku: string;
  category_id: number;
  category_name: string;
  current_stock: number;
  unit_of_measure: string;
  reorder_level: number;
  unit_price: number;
  supplier_id: number;
  supplier_name: string;
  location: string;
}

interface TransactionHistory {
  id: number;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  unit_price?: number;
  job_id?: number;
  job_name?: string;
  user_name: string;
  notes?: string;
}

const MaterialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would be an actual API call
        // const response = await axios.get(`${API_URL}/materials/${id}`);
        // setMaterial(response.data);
        
        // Sample data for development
        setMaterial({
          id: parseInt(id || '0'),
          name: 'Matte Paper A4',
          description: 'High quality matte paper for premium printing, 80gsm',
          sku: 'PAP-MTT-A4-80',
          category_id: 1,
          category_name: 'Paper',
          current_stock: 2500,
          unit_of_measure: 'sheets',
          reorder_level: 1000,
          unit_price: 0.05,
          supplier_id: 1,
          supplier_name: 'Paper Supplies Inc',
          location: 'Shelf A3'
        });
      } catch (error) {
        console.error('Error fetching material:', error);
        toast.error('Failed to load material details');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTransactions = async () => {
      try {
        setIsLoadingTransactions(true);
        // In a real app, this would be an actual API call
        // const response = await axios.get(`${API_URL}/materials/${id}/transactions`);
        // setTransactions(response.data);
        
        // Sample data for development
        setTransactions([
          {
            id: 1,
            transaction_type: 'purchase',
            quantity: 5000,
            transaction_date: '2023-09-01T10:30:00Z',
            unit_price: 0.05,
            user_name: 'John Admin',
            notes: 'Regular monthly order'
          },
          {
            id: 2,
            transaction_type: 'usage',
            quantity: -1500,
            transaction_date: '2023-09-05T14:20:00Z',
            job_id: 101,
            job_name: 'ABC Corp Brochures',
            user_name: 'Mike Operator',
            notes: 'Production run'
          },
          {
            id: 3,
            transaction_type: 'usage',
            quantity: -800,
            transaction_date: '2023-09-10T11:15:00Z',
            job_id: 102,
            job_name: 'XYZ Publishing Flyers',
            user_name: 'Mike Operator',
          },
          {
            id: 4,
            transaction_type: 'adjustment',
            quantity: -200,
            transaction_date: '2023-09-12T09:45:00Z',
            user_name: 'Sarah Manager',
            notes: 'Damaged in storage'
          },
        ]);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load transaction history');
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    
    if (id) {
      fetchMaterial();
      fetchTransactions();
    }
  }, [id]);

  const handleAdjustment = () => {
    const quantity = parseFloat(adjustmentQuantity);
    
    if (isNaN(quantity) || quantity === 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    if (!adjustmentReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }
    
    try {
      // In a real app, this would be an actual API call
      // await axios.post(`${API_URL}/materials/${id}/adjust`, {
      //   quantity,
      //   notes: adjustmentReason
      // });
      
      // For demo purposes, we'll update the state directly
      if (material) {
        // Update material stock
        setMaterial({
          ...material,
          current_stock: material.current_stock + quantity
        });
        
        // Add transaction to history
        const newTransaction: TransactionHistory = {
          id: Math.max(0, ...transactions.map(t => t.id)) + 1,
          transaction_type: 'adjustment',
          quantity: quantity,
          transaction_date: new Date().toISOString(),
          user_name: 'Current User', // In a real app, this would be the logged-in user
          notes: adjustmentReason
        };
        
        setTransactions([newTransaction, ...transactions]);
        
        // Clear form
        setAdjustmentQuantity('');
        setAdjustmentReason('');
        
        toast.success('Inventory adjusted successfully');
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Failed to adjust inventory');
    }
  };

  const getTransactionTypeDisplay = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Purchase';
      case 'usage':
        return 'Production Usage';
      case 'adjustment':
        return 'Manual Adjustment';
      case 'return':
        return 'Return to Supplier';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getTransactionTypeColor = (type: string, quantity: number) => {
    if (quantity > 0) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Material not found</p>
        <Link to="/materials" className="text-blue-500 mt-4 inline-block">
          Back to Materials List
        </Link>
      </div>
    );
  }

  const isLowStock = material.current_stock <= material.reorder_level;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Material Detail</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowBarcodeGenerator(true)}
              className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <QrCodeIcon />
              <span className="ml-2">Generate Barcode</span>
            </button>
            <Link
              to={`/materials/edit/${id}`}
              className="flex items-center bg-yellow-500 text-white px-3 py-2 rounded-md hover:bg-yellow-600 transition-colors"
            >
              <PencilIcon />
              <span className="ml-2">Edit</span>
            </Link>
          </div>
        </div>
        
        {/* Barcode Generator Modal */}
        {showBarcodeGenerator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-md w-full mx-4">
              <BarcodeGenerator 
                value={material?.sku ? `AG${material.sku.replace(/^AG/, '')}` : `AG-${id}`}
                materialName={material?.name}
                onClose={() => setShowBarcodeGenerator(false)} 
              />
            </div>
          </div>
        )}
        
        {/* Material Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">General Information</h2>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-2 text-gray-500">Name</td>
                  <td className="py-2">{material.name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">SKU</td>
                  <td className="py-2">{material.sku}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Category</td>
                  <td className="py-2">{material.category_name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Description</td>
                  <td className="py-2">{material.description}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Supplier</td>
                  <td className="py-2">{material.supplier_name}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Location</td>
                  <td className="py-2">{material.location}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-4">Inventory Information</h2>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-2 text-gray-500">Current Stock</td>
                  <td className="py-2 font-semibold">
                    {material.current_stock} {material.unit_of_measure}
                    {isLowStock && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Low Stock
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Reorder Level</td>
                  <td className="py-2">{material.reorder_level} {material.unit_of_measure}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Unit Price</td>
                  <td className="py-2">{formatINR(material.unit_price)} per {material.unit_of_measure}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500">Stock Value</td>
                  <td className="py-2">{formatINR(material.current_stock * material.unit_price)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Transaction History */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">Quantity</th>
                  <th className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">Unit Price</th>
                  <th className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {formatDateToIST(transaction.transaction_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                      {transaction.quantity > 0 ? '+' : ''}{transaction.quantity} {material.unit_of_measure}
                      {transaction.unit_price && (
                        <p className="text-xs text-gray-500">
                          @ {formatINR(transaction.unit_price)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {transaction.user_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Inventory Status & Adjustment */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Current Inventory</h2>
            <div className={`p-6 rounded-lg mb-4 text-center ${isLowStock ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className="text-3xl font-bold mt-1">
                {material.current_stock} <span className="text-sm font-medium">{material.unit_of_measure}</span>
              </p>
              {isLowStock && (
                <p className="text-sm text-red-600 mt-2">
                  Below reorder level ({material.reorder_level} {material.unit_of_measure})
                </p>
              )}
            </div>
            
            <h3 className="text-md font-medium mb-3">Adjust Inventory</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                    +/-
                  </span>
                  <input
                    type="number"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use positive for additions, negative for removals
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reason</label>
                <textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Enter reason for adjustment"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                ></textarea>
              </div>
              
              <button
                onClick={handleAdjustment}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Update Inventory
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/suppliers/${material.supplier_id}`}
                className="block w-full text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                View Supplier
              </Link>
              <Link
                to={`/orders/new?material=${material.id}`}
                className="block w-full text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Create Purchase Order
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(material.sku);
                  toast.success('SKU copied to clipboard');
                }}
                className="block w-full text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Copy SKU
              </button>
              <button
                onClick={() => setShowScanner(true)}
                className="block w-full text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Scan Barcode
              </button>
            </div>
          </div>
        </div>
      </div>
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <BarcodeScanner
              onScan={(result) => {
                toast.success(`Scanned: ${result}`);
                setShowScanner(false);
                // Here you would typically do something with the result
                // e.g., look up the material, update inventory, etc.
              }}
              onError={(error) => {
                toast.error(error);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialDetail; 