
const CACHE_NAME = 'korahub-v2';
const STATIC_CACHE = 'korahub-static-v2';
const DYNAMIC_CACHE = 'korahub-dynamic-v2';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/korahub.html',
  '/korahub-recherche.html',
  '/korahub-auth.html',
  '/korahub-produit-panier.html',
  '/korahub-kids.html',
  '/korahub-templates.html',
  '/korahub-faq.html',
  '/korahub-apropos.html',
  '/korahub-conditions.html',
  '/korahub-404.html',
  '/manifest.json',
  '/icon.svg'
];

// Install - cache static files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys
        .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Skip Firebase and external requests
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('google') ||
      url.hostname.includes('emailjs') ||
      e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      
      return fetch(e.request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          if (e.request.destination === 'document') {
            return caches.match('/korahub-404.html');
          }
        });
    })
  );
});

// Background sync for orders
self.addEventListener('sync', e => {
  if (e.tag === 'sync-orders') {
    e.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  console.log('Syncing pending orders...');
}

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'KoraHub', {
      body: data.body || 'Nouvelle notification',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
