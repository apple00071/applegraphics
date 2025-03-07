import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

// Define the context type
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  inventoryData: {
    materials: any[];
    orders: any[];
    stats: {
      totalMaterials: number;
      totalEquipment: number;
      pendingOrders: number;
      lowStockItems: number;
    };
  } | null;
  scanBarcode: (barcode: string) => Promise<any>;
  updateInventory: (materialId: number, amount: number) => Promise<any>;
  loading: boolean;
}

// Create the context with default values
const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  inventoryData: null,
  scanBarcode: () => Promise.resolve(null),
  updateInventory: () => Promise.resolve(null),
  loading: true
});

// Create a provider component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Initialize socket connection when the component mounts
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) return;

    setLoading(true);
    
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(SOCKET_URL);

    // Setup connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected!');
      setConnected(true);
      toast.success('Connected to inventory server');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected!');
      setConnected(false);
      toast.error('Disconnected from inventory server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setLoading(false);
      toast.error('Connection error. Please check your network.');
    });

    // Receive initial data from server
    newSocket.on('initialData', (data) => {
      console.log('Received initial data from server');
      setInventoryData(data);
      setLoading(false);
    });

    // Listen for real-time updates
    newSocket.on('inventoryUpdated', (data) => {
      console.log('Inventory updated:', data);
      
      setInventoryData((prevData: any) => {
        if (!prevData) return prevData;
        
        // Create a new materials array with the updated material
        const updatedMaterials = prevData.materials.map((material: any) => 
          material.id === data.material.id ? data.material : material
        );
        
        // Return updated state
        return {
          ...prevData,
          materials: updatedMaterials,
          stats: data.stats || prevData.stats
        };
      });
      
      toast.success(`Inventory updated: ${data.material.name}`);
    });

    // Save the socket instance
    setSocket(newSocket);

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [user]);

  // Function to scan barcode
  const scanBarcode = (barcode: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socket || !connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      // Show loading toast
      toast.loading('Scanning barcode...', { id: 'scan-barcode' });

      socket.emit('scanBarcode', barcode, (response: any) => {
        toast.dismiss('scan-barcode');
        
        if (response.success) {
          resolve(response.material);
        } else {
          reject(new Error(response.message || 'Failed to find item'));
        }
      });
    });
  };

  // Function to update inventory
  const updateInventory = (materialId: number, amount: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socket || !connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      // Show loading toast
      toast.loading('Updating inventory...', { id: 'update-inventory' });

      socket.emit('updateInventory', { materialId, amount }, (response: any) => {
        toast.dismiss('update-inventory');
        
        if (response.success) {
          resolve(response.material);
        } else {
          reject(new Error(response.message || 'Failed to update inventory'));
        }
      });
    });
  };

  // Provide the context values to children
  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        connected, 
        inventoryData, 
        scanBarcode, 
        updateInventory,
        loading
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => useContext(SocketContext);

export default SocketContext; 