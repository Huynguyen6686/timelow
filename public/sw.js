const CACHE_NAME = 'timeflow-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Force instant activation of newly installed service workers when requested by client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Warm up the cache with essential assets
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignore firebase/api/analytics/websocket real-time connections
  if (
    request.url.includes('/api/') || 
    request.url.includes('firebase') || 
    request.url.includes('firestore') || 
    request.url.includes('google-analyzer') ||
    request.url.includes('websocket')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, and asynchronously update cache in background 
        // to maintain fresh files (Stale-While-Revalidate pattern)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {
          // Fallback handled gracefully
        });
        return cachedResponse;
      }

      // Fallback to live network fetch
      return fetch(request).catch(() => {
        // If everything fails (offline) and they are requesting the main index.html
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
