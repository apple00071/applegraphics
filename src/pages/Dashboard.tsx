import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import StatsCard from '../components/StatsCard';
import LowStockAlert from '../components/LowStockAlert';
import RecentOrders from '../components/RecentOrders';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';
import { formatINR, formatDateToIST } from '../utils/formatters';

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // In a real app, you might have a single endpoint that returns all dashboard data
        // For demonstration, we'll simulate multiple API calls
        // const statsResponse = await axios.get(`${API_URL}/dashboard/stats`);
        // const lowStockResponse = await axios.get(`${API_URL}/materials/low-stock`);
        // const recentOrdersResponse = await axios.get(`${API_URL}/orders/recent`);
        
        // setStats(statsResponse.data);
        // setLowStockMaterials(lowStockResponse.data);
        // setRecentOrders(recentOrdersResponse.data);
        
        // Simulated data for development
        setStats({
          totalMaterials: 152,
          totalEquipment: 24,
          pendingOrders: 7,
          lowStockItems: 5
        });
        
        // Simulated low stock items
        setLowStockMaterials([
          { id: 1, name: 'Matte Paper A4', current_stock: 10, reorder_level: 20, unit_of_measure: 'sheets' },
          { id: 2, name: 'Cyan Ink', current_stock: 5, reorder_level: 15, unit_of_measure: 'liters' },
          { id: 3, name: 'Glossy Paper A3', current_stock: 8, reorder_level: 25, unit_of_measure: 'sheets' },
          { id: 4, name: 'Black Ink', current_stock: 12, reorder_level: 30, unit_of_measure: 'liters' },
          { id: 5, name: 'Binding Wire', current_stock: 3, reorder_level: 10, unit_of_measure: 'rolls' }
        ]);
        
        // Simulated recent orders
        setRecentOrders([
          { id: 101, customer_name: 'ABC Corp', order_date: '2023-09-15', status: 'in-progress', total_amount: 1250.00 },
          { id: 102, customer_name: 'XYZ Publishing', order_date: '2023-09-14', status: 'pending', total_amount: 845.50 },
          { id: 103, customer_name: 'Local Magazine', order_date: '2023-09-12', status: 'completed', total_amount: 2340.75 },
          { id: 104, customer_name: 'City Newspaper', order_date: '2023-09-10', status: 'completed', total_amount: 1765.25 }
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const handleScan = (result: string) => {
    setScannedCode(result);
    setShowScanner(false);
    toast.success(`Barcode scanned: ${result}`);
    // In a real application, you would look up the material or item associated with this barcode
  };

  const handleScanError = (error: string) => {
    toast.error(`Scan error: ${error}`);
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
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <QrCodeIcon />
          <span className="ml-2">Scan Barcode</span>
        </button>
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
      
      {/* Scanned Result Notification */}
      {scannedCode && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Last scanned code: {scannedCode}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button 
                  onClick={() => setScannedCode(null)} 
                  className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
    </div>
  );
};

export default Dashboard; 