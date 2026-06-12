// Service Worker for "这顿不算" (Calorie Tracker PWA)
// Cache-first for static assets, network-first for HTML (fresh content), offline fallback

const CACHE_NAME = 'calorie-tracker-v2';
const STATIC_CACHE = 'calorie-tracker-static-v2';

// Assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/calendar',
  '/calendar/settings',
  '/camera',
  '/fitness',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRE_CACHE).catch(() => {
        // Individual failures are ok — we'll cache on first access
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and non-http(s) requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Skip API calls and Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return;
  }

  // HTML navigation: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
