import { v4 as uuidv4 } from 'uuid';

// Add type declaration for SyncManager
declare global {
  interface ServiceWorkerRegistration {
    sync: {
      register(tag: string): Promise<void>;
    }
  }
  
  interface Window {
    SyncManager: any;
  }
}

// Database configuration
const DB_NAME = 'offline-inventory';
const DB_VERSION = 1;
const STORES = {
  PENDING_UPDATES: 'pending-updates',
  PENDING_ORDERS: 'pending-orders',
  CACHED_MATERIALS: 'cached-materials',
  CACHED_ORDERS: 'cached-orders'
};

// Open the database
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PENDING_UPDATES)) {
        db.createObjectStore(STORES.PENDING_UPDATES, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_ORDERS)) {
        db.createObjectStore(STORES.PENDING_ORDERS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.CACHED_MATERIALS)) {
        db.createObjectStore(STORES.CACHED_MATERIALS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.CACHED_ORDERS)) {
        db.createObjectStore(STORES.CACHED_ORDERS, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Save inventory update for offline sync
export const saveInventoryUpdate = async (update: any): Promise<string> => {
  const db = await openDB();
  const id = uuidv4();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_UPDATES], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_UPDATES);
    
    const request = store.add({ ...update, id, timestamp: Date.now() });
    
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Save order for offline sync
export const saveOrderForSync = async (order: any): Promise<string> => {
  const db = await openDB();
  const id = uuidv4();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PENDING_ORDERS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ORDERS);
    
    const request = store.add({ ...order, id, timestamp: Date.now() });
    
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Cache materials for offline use
export const cacheMaterials = async (materials: any[]): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_MATERIALS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_MATERIALS);
    
    // Clear existing cache
    store.clear();
    
    // Add all materials to cache
    let successCount = 0;
    const totalMaterials = materials.length;
    
    materials.forEach(material => {
      const request = store.add({ 
        ...material, 
        timestamp: Date.now() 
      });
      
      request.onsuccess = () => {
        successCount++;
        if (successCount === totalMaterials) {
          console.log(`Successfully cached ${successCount} materials`);
        }
      };
      
      request.onerror = (event) => {
        console.error('Error caching material:', event);
      };
    });
    
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

// Get cached materials
export const getCachedMaterials = async (): Promise<any[]> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_MATERIALS], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_MATERIALS);
    
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Cache orders for offline use
export const cacheOrders = async (orders: any[]): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_ORDERS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_ORDERS);
    
    // Clear existing cache
    store.clear();
    
    // Add all orders to cache
    orders.forEach(order => {
      store.add({ ...order, timestamp: Date.now() });
    });
    
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    
    transaction.onerror = () => reject(transaction.error);
  });
};

// Get cached orders
export const getCachedOrders = async (): Promise<any[]> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_ORDERS], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_ORDERS);
    
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Request background sync when online
export const requestSync = async (syncType: 'inventory' | 'orders'): Promise<void> => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (syncType === 'inventory') {
        await registration.sync.register('sync-inventory-updates');
      } else {
        await registration.sync.register('sync-new-orders');
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
};

// Update a cached material (useful for offline inventory updates)
export const updateCachedMaterial = async (materialId: string, newStockAmount: number): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_MATERIALS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_MATERIALS);
    
    // Get the current material
    const getRequest = store.get(materialId);
    
    getRequest.onsuccess = () => {
      if (getRequest.result) {
        // Update the material with new stock amount
        const updatedMaterial = {
          ...getRequest.result,
          current_stock: newStockAmount,
          last_updated: Date.now()
        };
        
        // Put the updated material back in the store
        const putRequest = store.put(updatedMaterial);
        
        putRequest.onsuccess = () => {
          console.log(`Successfully updated cached material ${materialId} to stock: ${newStockAmount}`);
          resolve();
        };
        
        putRequest.onerror = (event) => {
          console.error('Error updating cached material:', event);
          reject(putRequest.error);
        };
      } else {
        reject(new Error(`Material with ID ${materialId} not found in cache`));
      }
    };
    
    getRequest.onerror = () => {
      reject(getRequest.error);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// Optimize the function for getting material by ID or SKU with index support
export const getCachedMaterialByIdentifier = async (identifier: string): Promise<any | null> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_MATERIALS], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_MATERIALS);
    
    // First try to find by ID
    const getByIdRequest = store.get(identifier);
    
    getByIdRequest.onsuccess = () => {
      if (getByIdRequest.result) {
        // Found by ID
        db.close();
        resolve(getByIdRequest.result);
        return;
      }
      
      // Not found by ID, try to find by SKU or barcode
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const materials = getAllRequest.result;
        
        // Look for matches in SKU, barcode, or other relevant fields
        const material = materials.find(m => 
          m.sku === identifier || 
          m.barcode === identifier ||
          m.model_number === identifier
        );
        
        db.close();
        resolve(material || null);
      };
      
      getAllRequest.onerror = () => {
        db.close();
        reject(getAllRequest.error);
      };
    };
    
    getByIdRequest.onerror = () => {
      db.close();
      reject(getByIdRequest.error);
    };
  });
};

// Pre-cache materials by chunk to handle large datasets
export const cacheMaterialsInChunks = async (materials: any[], chunkSize = 50): Promise<void> => {
  // Process materials in chunks to avoid transaction timeouts
  const chunks = [];
  for (let i = 0; i < materials.length; i += chunkSize) {
    chunks.push(materials.slice(i, i + chunkSize));
  }
  
  console.log(`Caching ${materials.length} materials in ${chunks.length} chunks`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await cacheMaterialChunk(chunk);
    console.log(`Cached chunk ${i+1}/${chunks.length} (${chunk.length} materials)`);
  }
  
  console.log('Finished caching all materials');
};

// Helper function to cache a chunk of materials
const cacheMaterialChunk = async (materials: any[]): Promise<void> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHED_MATERIALS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_MATERIALS);
    
    materials.forEach(material => {
      store.put({ 
        ...material, 
        timestamp: Date.now() 
      });
    });
    
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}; 