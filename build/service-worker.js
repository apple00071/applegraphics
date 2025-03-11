// Service Worker for PrintPress Inventory PWA
const CACHE_NAME = 'printpress-cache-v1';

// Assets to cache immediately on installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // For API requests, try network first, then cache
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache successful responses
              if (response.status === 200) {
                cache.put(event.request, responseToCache);
              }
            });
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
  } else {
    // For non-API requests, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Cache hit - return the response from cache
          if (response) {
            return response;
          }
          // Not in cache - fetch from network
          return fetch(event.request)
            .then((response) => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              // Clone the response to store in cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return response;
            });
        })
    );
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inventory-updates') {
    event.waitUntil(syncInventoryUpdates());
  } else if (event.tag === 'sync-new-orders') {
    event.waitUntil(syncNewOrders());
  }
});

// Sync inventory updates
async function syncInventoryUpdates() {
  try {
    const db = await openDB('offline-inventory', 1);
    const updates = await db.getAll('pending-updates');
    
    for (const update of updates) {
      try {
        const response = await fetch('/api/inventory/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        });
        
        if (response.ok) {
          await db.delete('pending-updates', update.id);
        }
      } catch (error) {
        console.error('Failed to sync update:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Sync new orders
async function syncNewOrders() {
  try {
    const db = await openDB('offline-inventory', 1);
    const orders = await db.getAll('pending-orders');
    
    for (const order of orders) {
      try {
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order),
        });
        
        if (response.ok) {
          await db.delete('pending-orders', order.id);
        }
      } catch (error) {
        console.error('Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Helper function to open IndexedDB
function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-updates')) {
        db.createObjectStore('pending-updates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-orders')) {
        db.createObjectStore('pending-orders', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
} 