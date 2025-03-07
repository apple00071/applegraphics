import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://qlkxukzmtkkxarcqzysn.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsa3h1a3ptdGtreGFyY3F6eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNTkzODcsImV4cCI6MjA1NjgzNTM4N30.60ab2zNHSUkm23RR_NUo9-yDlUo3lcqOUnIF4M-0K0o';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define interfaces for the inventory data structure
interface Stats {
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
  unit_price?: number;
  category_name?: string;
  sku?: string;
  [key: string]: any; // Allow for additional properties
}

interface Order {
  id: number;
  customer_name: string;
  order_date: string;
  status: string;
  total_amount: number;
  [key: string]: any; // Allow for additional properties
}

interface InventoryData {
  materials: Material[];
  orders: Order[];
  stats: Stats;
}

// Define the context type
interface InventoryContextType {
  connected: boolean;
  inventoryData: InventoryData | null;
  scanBarcode: (barcode: string) => Promise<any>;
  updateInventory: (materialId: number, amount: number) => Promise<any>;
  loading: boolean;
}

// Create the context with default values
const InventoryContext = createContext<InventoryContextType>({
  connected: false,
  inventoryData: null,
  scanBarcode: () => Promise.resolve(null),
  updateInventory: () => Promise.resolve(null),
  loading: true
});

// Create a provider component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Initialize Supabase connection and fetch data
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) return;

    setLoading(true);
    let isMounted = true;
    
    console.log('Initializing Supabase data connection');
    
    // Function to fetch all inventory data
    const fetchInventoryData = async () => {
      try {
        console.log('📊 Fetching inventory data from Supabase...');
        
        // Fetch materials
        const { data: materials, error: materialsError } = await supabase
          .from('materials')
          .select('*');
        
        if (materialsError) throw materialsError;
        console.log(`✅ Fetched ${materials?.length || 0} materials from Supabase`);
        
        // Fetch orders
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('order_date', { ascending: false })
          .limit(10);
        
        if (ordersError) throw ordersError;
        console.log(`✅ Fetched ${orders?.length || 0} orders from Supabase`);
        
        // Calculate stats
        const lowStockItems = materials.filter(m => m.current_stock < m.reorder_level).length;
        console.log(`📉 Low stock items: ${lowStockItems}`);
        
        // If component still mounted, update state
        if (isMounted) {
          setInventoryData({
            materials: materials || [],
            orders: orders || [],
            stats: {
              totalMaterials: materials.length,
              totalEquipment: 0, // Update as needed
              pendingOrders: 0, // Update as needed
              lowStockItems: lowStockItems
            }
          });
          setLoading(false);
          setConnected(true);
          toast.success('Connected to inventory database');
        }
      } catch (error) {
        console.error('❌ Error fetching inventory data:', error);
        if (isMounted) {
          setLoading(false);
          toast.error('Failed to load inventory data.');
        }
      }
    };
    
    // Initial data fetch
    fetchInventoryData();
    
    // Set up real-time subscriptions
    console.log('🔄 Setting up Supabase real-time subscriptions...');
    
    // 1. Subscribe to materials table changes
    const materialsSubscription = supabase
      .channel('materials-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'materials' 
      }, (payload) => {
        console.log('📊 Materials changed:', payload.eventType);
        // Update materials in state
        setInventoryData((prevData) => {
          if (!prevData) return prevData;
          
          let updatedMaterials = [...prevData.materials];
          
          // Handle different change types
          if (payload.eventType === 'INSERT') {
            console.log('➕ New material added:', payload.new.name);
            updatedMaterials.push(payload.new as Material);
          } else if (payload.eventType === 'UPDATE') {
            console.log('🔄 Material updated:', payload.new.name);
            updatedMaterials = updatedMaterials.map(material => 
              material.id === payload.new.id ? (payload.new as Material) : material
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('❌ Material deleted:', payload.old.name);
            updatedMaterials = updatedMaterials.filter(material => 
              material.id !== payload.old.id
            );
          }
          
          // Recalculate low stock count
          const lowStockCount = updatedMaterials.filter(
            m => m.current_stock < m.reorder_level
          ).length;
          
          return {
            ...prevData,
            materials: updatedMaterials,
            stats: {
              ...prevData.stats,
              lowStockItems: lowStockCount
            }
          };
        });
        
        // Show notification
        if (payload.eventType === 'UPDATE') {
          toast.success(`Inventory updated: ${payload.new.name}`);
        }
      })
      .subscribe();
    
    // 2. Subscribe to orders table changes
    const ordersSubscription = supabase
      .channel('orders-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        console.log('Orders changed:', payload);
        
        // Update orders in state
        setInventoryData((prevData) => {
          if (!prevData) return prevData;
          
          let updatedOrders = [...prevData.orders];
          
          // Handle different change types
          if (payload.eventType === 'INSERT') {
            updatedOrders.unshift(payload.new as Order); // Add to beginning
            updatedOrders = updatedOrders.slice(0, 10); // Keep top 10
          } else if (payload.eventType === 'UPDATE') {
            updatedOrders = updatedOrders.map(order => 
              order.id === payload.new.id ? (payload.new as Order) : order
            );
          } else if (payload.eventType === 'DELETE') {
            updatedOrders = updatedOrders.filter(order => 
              order.id !== payload.old.id
            );
          }
          
          // Recalculate pending orders count
          const pendingCount = updatedOrders.filter(
            o => o.status === 'Pending'
          ).length;
          
          return {
            ...prevData,
            orders: updatedOrders,
            stats: {
              ...prevData.stats,
              pendingOrders: pendingCount
            }
          };
        });
      })
      .subscribe();
    
    // Save subscriptions to clean up later
    setSubscriptions([materialsSubscription, ordersSubscription]);
    
    // Cleanup function
    return () => {
      console.log('Cleaning up Supabase subscriptions');
      isMounted = false;
      
      // Unsubscribe from all channels
      subscriptions.forEach(subscription => {
        if (subscription) supabase.removeChannel(subscription);
      });
    };
  }, [user]);

  // Cache data for offline use, but don't rely on this as primary storage
  if (inventoryData) {
    try {
      localStorage.setItem('inventoryDataCache', JSON.stringify(inventoryData));
      console.log('📦 Cached inventory data for offline use');
    } catch (error) {
      console.error('❌ Error caching inventory data:', error);
    }
  }

  // Function to scan barcode (search material by SKU)
  const scanBarcode = async (barcode: string): Promise<any> => {
    try {
      // Show loading toast
      toast.loading('Scanning barcode...', { id: 'scan-barcode' });
      
      // Search for material in Supabase by SKU
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('sku', barcode)
        .single();
      
      toast.dismiss('scan-barcode');
      
      if (error) {
        throw new Error('Material not found');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error scanning barcode:', error);
      throw new Error(error.message || 'Failed to scan barcode');
    }
  };

  // Function to update inventory
  const updateInventory = async (materialId: number, amount: number): Promise<any> => {
    try {
      // Show loading toast
      toast.loading('Updating inventory...', { id: 'update-inventory' });
      
      // Get the current material
      const { data: material, error: getMaterialError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();
      
      if (getMaterialError) throw getMaterialError;
      
      // Calculate new stock level
      const newStockLevel = material.current_stock + amount;
      
      // Make sure stock doesn't go below zero
      if (newStockLevel < 0) {
        toast.dismiss('update-inventory');
        throw new Error('Insufficient stock');
      }
      
      // Update the material stock
      const { data: updatedMaterial, error: updateError } = await supabase
        .from('materials')
        .update({ current_stock: newStockLevel })
        .eq('id', materialId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Log transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          material_id: materialId,
          transaction_type: amount > 0 ? 'add' : 'remove',
          quantity: Math.abs(amount),
          user_id: user?.id,
          notes: `Updated via barcode scanner`
        }]);
      
      if (transactionError) console.error('Error logging transaction:', transactionError);
      
      toast.dismiss('update-inventory');
      return updatedMaterial;
    } catch (error: any) {
      toast.dismiss('update-inventory');
      console.error('Error updating inventory:', error);
      throw new Error(error.message || 'Failed to update inventory');
    }
  };

  // Provide the context values to children
  return (
    <InventoryContext.Provider 
      value={{ 
        connected, 
        inventoryData, 
        scanBarcode, 
        updateInventory,
        loading
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

// Custom hook to use the inventory context
export const useSocket = () => useContext(InventoryContext);

export default InventoryContext; 