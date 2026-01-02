import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import {
  cacheMaterials,
  cacheOrders,
  getCachedMaterials,
  getCachedOrders,
  saveInventoryUpdate,
  saveOrderForSync,
  requestSync
} from '../utils/offlineStorage';

// Define interfaces for the inventory data structure
// Define interfaces for the inventory data structure
interface Stats {
  totalMaterials: number;
  pendingOrders: number;
  lowStockItems: number;
  totalOrders: number;
  completedOrders: number;
}

// ... (Material and Order interfaces remain the same) 
// BUT replace_file_content needs context. I will target the specific blocks.

// Block 1: Interface update
interface Stats {
  totalMaterials: number;
  pendingOrders: number;
  lowStockItems: number;
  totalOrders: number;
  completedOrders: number;
}


// Export the interfaces so they can be used elsewhere
export interface Material {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
  unit_of_measure: string;
  current_stock: number;
  reorder_level: number;
  unit_price: number;
}

export interface Order {
  id: string;
  name?: string;           // For database structure variation
  customer_name?: string;  // Making this optional
  order_date: string;
  required_date?: string;  // Making this optional
  status: string;
  total_amount: number;
  job_number?: string;
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
  updateInventory: (materialId: string, amount: number) => Promise<any>;
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online! Syncing data...');
      // Trigger sync when back online
      requestSync('inventory');
      requestSync('orders');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

        // Try to fetch from Supabase if online
        if (navigator.onLine) {
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
            .order('order_date', { ascending: false });

          if (ordersError) throw ordersError;
          console.log(`✅ Fetched ${orders?.length || 0} orders from Supabase`);

          // Debug stats calculation
          if (orders && orders.length > 0) {
            console.log('Order Statuses found:', orders.map(o => o.status));
            console.log('Unique Order Statuses:', Array.from(new Set(orders.map(o => o.status))));
          }

          // Calculate dashboard stats
          // Calculate dashboard stats
          const stats = {
            totalMaterials: materials?.length || 0,
            pendingOrders: orders?.filter(order => order.status?.toLowerCase() === 'pending').length || 0,
            lowStockItems: materials?.filter(material =>
              material.current_stock <= material.reorder_level
            ).length || 0,
            totalOrders: orders?.length || 0,
            completedOrders: orders?.filter(order => order.status?.toLowerCase() === 'completed').length || 0
          };

          // Cache data for offline use
          if (materials) await cacheMaterials(materials);
          if (orders) await cacheOrders(orders);

          if (isMounted) {
            setInventoryData({ materials, orders, stats });
            setConnected(true);
            setLoading(false);
          }
        } else {
          // Fetch from IndexedDB if offline
          console.log('📱 Offline mode: Fetching data from local cache...');

          const materials = await getCachedMaterials();
          const orders = await getCachedOrders();

          console.log(`✅ Fetched ${materials?.length || 0} materials from local cache`);
          console.log(`✅ Fetched ${orders?.length || 0} orders from local cache`);

          // Calculate dashboard stats
          // Calculate dashboard stats
          const stats = {
            totalMaterials: materials?.length || 0,
            pendingOrders: orders?.filter(order => order.status?.toLowerCase() === 'pending').length || 0,
            lowStockItems: materials?.filter(material =>
              material.current_stock <= material.reorder_level
            ).length || 0,
            totalOrders: orders?.length || 0,
            completedOrders: orders?.filter(order => order.status?.toLowerCase() === 'completed').length || 0
          };

          if (isMounted) {
            setInventoryData({ materials, orders, stats });
            setConnected(false);
            setLoading(false);
            toast('Using offline data. Changes will sync when you reconnect.', {
              icon: 'ℹ️'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching inventory data:', error);

        // Try to load from cache if online fetch fails
        try {
          console.log('🔄 Falling back to cached data...');
          const materials = await getCachedMaterials();
          const orders = await getCachedOrders();

          // Calculate dashboard stats
          // Calculate dashboard stats
          const stats = {
            totalMaterials: materials?.length || 0,
            pendingOrders: orders?.filter(order => order.status?.toLowerCase() === 'pending').length || 0,
            lowStockItems: materials?.filter(material =>
              material.current_stock <= material.reorder_level
            ).length || 0,
            totalOrders: orders?.length || 0,
            completedOrders: orders?.filter(order => order.status?.toLowerCase() === 'completed').length || 0
          };

          if (isMounted) {
            setInventoryData({ materials, orders, stats });
            setConnected(false);
            setLoading(false);
            toast('Using cached data due to connection issues.', {
              icon: '⚠️'
            });
          }
        } catch (cacheError) {
          console.error('Error fetching cached data:', cacheError);
          if (isMounted) {
            setConnected(false);
            setLoading(false);
            toast.error('Failed to load data. Please try again later.');
          }
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
            // Removed slicing to keep accurate stats
          } else if (payload.eventType === 'UPDATE') {
            updatedOrders = updatedOrders.map(order =>
              order.id === payload.new.id ? (payload.new as Order) : order
            );
          } else if (payload.eventType === 'DELETE') {
            updatedOrders = updatedOrders.filter(order =>
              order.id !== payload.old.id
            );
          }

          // Recalculate stats
          const pendingCount = updatedOrders.filter(o => o.status?.toLowerCase() === 'pending').length;
          const completedCount = updatedOrders.filter(o => o.status?.toLowerCase() === 'completed').length;

          return {
            ...prevData,
            orders: updatedOrders,
            stats: {
              ...prevData.stats,
              pendingOrders: pendingCount,
              totalOrders: updatedOrders.length,
              completedOrders: completedCount
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

      console.log('🔍 Scanning barcode:', barcode);

      // Trim the barcode to remove any whitespace
      const cleanBarcode = barcode.trim();

      // Log all materials for debugging (remove in production)
      const { data: allMats } = await supabase.from('materials').select('id, sku, name');
      console.log('📋 Available materials:', allMats);

      // Search for material in Supabase by SKU (case insensitive)
      let { data, error } = await supabase
        .from('materials')
        .select('*')
        .ilike('sku', cleanBarcode)
        .single();

      // If not found, try a more flexible search approach
      if (error) {
        console.log('⚠️ Exact match not found, trying flexible search');

        // Try search by contains
        const { data: containsData, error: containsError } = await supabase
          .from('materials')
          .select('*')
          .ilike('sku', `%${cleanBarcode}%`);

        if (!containsError && containsData && containsData.length > 0) {
          console.log('✅ Found material with partial SKU match:', containsData[0]);
          data = containsData[0];
          error = null;
        }
      }

      toast.dismiss('scan-barcode');

      if (error || !data) {
        console.error('❌ Material not found for barcode:', cleanBarcode);
        throw new Error(`Material not found for barcode: ${cleanBarcode}`);
      }

      console.log('✅ Found material:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error scanning barcode:', error);
      toast.dismiss('scan-barcode');
      throw new Error(error.message || 'Failed to scan barcode');
    }
  };

  // Function to update inventory
  const updateInventory = async (materialId: string, amount: number): Promise<any> => {
    try {
      if (navigator.onLine) {
        // Online - update directly
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
      } else {
        // Offline - save update for later sync
        await saveInventoryUpdate({ materialId, amount });

        // Update local state
        setInventoryData(prevData => {
          if (!prevData) return null;

          const updatedMaterials = prevData.materials.map(material => {
            if (material.id === materialId) {
              return {
                ...material,
                current_stock: material.current_stock + amount
              };
            }
            return material;
          });

          return {
            ...prevData,
            materials: updatedMaterials
          };
        });

        toast.success('Inventory updated locally. Will sync when online.');
        return { success: true, message: 'Saved for sync' };
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
      return { success: false, error };
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