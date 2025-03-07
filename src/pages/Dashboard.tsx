import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import StatsCard from '../components/StatsCard';
import LowStockAlert from '../components/LowStockAlert';
import RecentOrders from '../components/RecentOrders';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';
import { formatINR, formatDateToIST } from '../utils/formatters';
import { Link } from 'react-router-dom';
import supabase from '../api/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Custom icon components
const ChartPieIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-green-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
  </svg>
);

const CubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-blue-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-yellow-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ExclamationCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-red-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

const QrCodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);

// New icons for the barcode result modal
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface DashboardStats {
  totalMaterials: number;
  totalEquipment: number;
  pendingOrders: number;
  lowStockItems: number;
}

interface Material {
  id: number;
  name: string;
  current_stock: number;
  reorder_level: number;
  unit_of_measure?: string;
}

interface Order {
  id: number;
  customer_name: string;
  order_date: string;
  status: string;
  total_amount: number;
}

// New interface for material details
interface ScannedMaterial {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
  unit_of_measure: string;
  unit_price: number;
  category_name: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMaterials: 0,
    totalEquipment: 0,
    pendingOrders: 0,
    lowStockItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedMaterial, setScannedMaterial] = useState<ScannedMaterial | null>(null);
  const [showScannedMaterial, setShowScannedMaterial] = useState(false);
  const [quantityToUpdate, setQuantityToUpdate] = useState<number>(1);
  const [updateType, setUpdateType] = useState<'add' | 'remove'>('add');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error('No active session found');
          return;
        }
        
        // Subscribe to real-time updates for materials
        const materialsSubscription = supabase
          .channel('materials-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'materials'
            },
            (payload: RealtimePostgresChangesPayload<Material>) => {
              // Refresh dashboard data when materials change
              fetchDashboardData();
            }
          )
          .subscribe();

        // Fetch initial dashboard data
        const { data: dashboardData, error } = await supabase
          .from('dashboard_stats')
          .select('*')
          .single();

        if (error) throw error;

        if (dashboardData) {
          setStats({
            totalMaterials: dashboardData.total_materials || 0,
            totalEquipment: dashboardData.total_equipment || 0,
            pendingOrders: dashboardData.pending_orders || 0,
            lowStockItems: dashboardData.low_stock_items || 0
          });
        }

        // Fetch low stock materials using proper comparison
        const { data: lowStockData, error: lowStockError } = await supabase
          .from('materials')
          .select('*')
          .filter('current_stock', 'lt', 'reorder_level');

        if (lowStockError) throw lowStockError;
        setLowStockMaterials(lowStockData || []);

        // Fetch recent orders
        const { data: recentOrdersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (ordersError) throw ordersError;
        setRecentOrders(recentOrdersData || []);

        return () => {
          materialsSubscription.unsubscribe();
        };
      } catch (error: any) {
        console.error('Error in dashboard component:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const handleScan = async (result: string) => {
    // Always ensure scanner is closed first to prevent UI issues
    setShowScanner(false);
    toast.success(`Scanned code: ${result}`);
    setScannedCode(result);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('No authentication token found. Please try logging in again.');
        return;
      }
      
      // Search for material by barcode using the API
      const apiUrl = `${API_URL}/materials/barcode/${result}`;
      
      try {
        toast.loading(`Searching for material with code: ${result}...`, { id: 'material-search' });
        
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        toast.dismiss('material-search');
        
        if (response.data) {
          toast.success(`Found material: ${response.data.name}`);
          // Set state in a timeout to ensure UI updates properly
          setTimeout(() => {
            setScannedMaterial(response.data);
            setShowScannedMaterial(true);
          }, 100);
        } else {
          toast.error(`No material data in response for code: ${result}`);
        }
      } catch (error: any) {
        toast.dismiss('material-search');
        
        if (error.response) {
          // Server responded with error
          const status = error.response.status;
          const message = error.response.data?.message || 'Unknown error';
          const details = error.response.data?.details || '';
          
          switch (status) {
            case 401:
              toast.error('Session expired. Please log in again.');
              break;
            case 404:
              toast.error(`No material found with barcode: ${result}`);
              break;
            case 500:
              toast.error(`Server error: ${message}`);
              break;
            default:
              toast.error(`Error (${status}): ${message}`);
          }
          
          // Show technical details in a separate toast for debugging
          if (details) {
            toast.error(`Details: ${details}`, { duration: 10000 });
          }
        } else if (error.request) {
          // Request made but no response
          toast.error('No response from server. Please check your internet connection.');
        } else {
          // Error setting up request
          toast.error(`Request failed: ${error.message}`);
        }
      }
    } catch (error: any) {
      toast.error(`Unexpected error: ${error.message}`);
    }
  };

  const handleScanError = (error: string) => {
    toast.error(`Scan error: ${error}`);
  };

  const handleUpdateQuantity = async () => {
    try {
      if (!scannedMaterial) return;
      
      const updatedQuantity = updateType === 'add' 
        ? scannedMaterial.current_stock + quantityToUpdate
        : scannedMaterial.current_stock - quantityToUpdate;
      
      if (updatedQuantity < 0) {
        toast.error('Cannot reduce stock below zero');
        return;
      }

      const { error } = await supabase
        .from('materials')
        .update({ current_stock: updatedQuantity })
        .eq('id', scannedMaterial.id);

      if (error) throw error;

      // Update the scanned material state
      setScannedMaterial({
        ...scannedMaterial,
        current_stock: updatedQuantity
      });

      // Log the transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          material_id: scannedMaterial.id,
          transaction_type: updateType === 'add' ? 'stock_in' : 'stock_out',
          quantity: quantityToUpdate,
          previous_stock: scannedMaterial.current_stock,
          new_stock: updatedQuantity
        });

      if (transactionError) throw transactionError;
      
      toast.success(`${scannedMaterial.name} ${updateType === 'add' ? 'stock increased' : 'stock decreased'} by ${quantityToUpdate}`);
    } catch (error: any) {
      console.error('Error updating material quantity:', error);
      toast.error('Failed to update inventory');
    }
  };

  const handleViewDetails = () => {
    if (!scannedMaterial) return;
    // Close the modal and navigate to material detail page
    setShowScannedMaterial(false);
    // Navigation will happen via Link component in the UI
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <QrCodeIcon />
            <span className="ml-2">Scan Barcode/QR</span>
          </button>
        </div>
      </div>
      
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md w-full mx-4">
            <BarcodeScanner 
              onScan={handleScan} 
              onError={handleScanError} 
              onClose={() => setShowScanner(false)} 
            />
          </div>
        </div>
      )}
      
      {/* Scanned Material Details Modal - Wrapped in try-catch to prevent crashes */}
      {(() => {
        try {
          return showScannedMaterial && scannedMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Material Found</h3>
                  <button 
                    onClick={() => {
                      setShowScannedMaterial(false);
                    }} 
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{scannedMaterial.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">SKU:</span>
                    <span className="font-medium">{scannedMaterial.sku}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{scannedMaterial.category_name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Current Stock:</span>
                    <span className="font-medium">{scannedMaterial.current_stock} {scannedMaterial.unit_of_measure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="font-medium">{formatINR(scannedMaterial.unit_price)}</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h4 className="font-medium mb-2">Quick Actions</h4>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <button 
                        onClick={() => setUpdateType('add')}
                        className={`px-3 py-1 rounded-l-md ${updateType === 'add' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      >
                        <PlusIcon />
                      </button>
                      <button 
                        onClick={() => setUpdateType('remove')}
                        className={`px-3 py-1 rounded-r-md ${updateType === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
                      >
                        <MinusIcon />
                      </button>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="1"
                        value={quantityToUpdate}
                        onChange={(e) => setQuantityToUpdate(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md mr-2"
                      />
                      <span>{scannedMaterial.unit_of_measure}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      onClick={handleUpdateQuantity}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        updateType === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                      } text-white`}
                    >
                      {updateType === 'add' ? 'Add Stock' : 'Remove Stock'}
                    </button>
                    
                    <Link
                      to={`/materials/${scannedMaterial.id}`}
                      className="flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      View Details
                    </Link>
                  </div>
                  
                  <Link
                    to={`/qr-generator/${scannedMaterial.sku}`}
                    className="flex items-center justify-center w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                  >
                    <QrCodeIcon />
                    <span className="ml-2">Generate QR Code</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        } catch (error) {
          // If there's any error in rendering the modal, log it and return null
          console.error('Error rendering material modal:', error);
          // Attempt to reset the problematic state
          setTimeout(() => {
            setShowScannedMaterial(false);
            setScannedMaterial(null);
          }, 0);
          return null;
        }
      })()}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard 
          title="Total Materials" 
          value={stats.totalMaterials} 
          icon={<CubeIcon />} 
          bgColor="bg-blue-50" 
        />
        <StatsCard 
          title="Equipment" 
          value={stats.totalEquipment} 
          icon={<ChartPieIcon />} 
          bgColor="bg-green-50" 
        />
        <StatsCard 
          title="Pending Orders" 
          value={stats.pendingOrders} 
          icon={<TruckIcon />} 
          bgColor="bg-yellow-50" 
        />
        <StatsCard 
          title="Low Stock Items" 
          value={stats.lowStockItems} 
          icon={<ExclamationCircleIcon />} 
          bgColor="bg-red-50" 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          <LowStockAlert materials={lowStockMaterials} />
        </div>
        
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          <RecentOrders orders={recentOrders} />
        </div>
      </div>
      
      {/* Last Scanned Code */}
      {scannedCode && (
        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-500">Last scanned code: <span className="font-medium">{scannedCode}</span></p>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 