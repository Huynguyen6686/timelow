const CACHE_NAME = 'timeflow-cache-v3';
const ASSETS_TO_CACHE = [
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
    })
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
    request.mode === 'navigate'
      ? fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html').then((cachedResponse) => cachedResponse || caches.match('/')))
      : caches.match(request).then((cachedResponse) => {
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

      // Fallback to live network fetch, and cache static assets dynamically
      return fetch(request).then((networkResponse) => {
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          (request.url.includes('/assets/') || 
           request.url.endsWith('.png') || 
           request.url.endsWith('.jpg') || 
           request.url.endsWith('.svg') || 
           request.url.endsWith('.woff2'))
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_error) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Timeflow';
  const options = {
    body: data.body || 'Bạn có một nhắc nhở mới.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'timeflow-reminder',
    renotify: true,
    data: {
      url: data.url || '/tasks',
      taskId: data.taskId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
