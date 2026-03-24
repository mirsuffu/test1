/*
  JG. SUFFU — Service Worker
  Handles: Push Notifications + Offline Cache (app shell)
  Strategy: Stale-While-Revalidate for JS/CSS, Cache-First for images
*/

const CACHE_VERSION = '20260323';
const CACHE_NAME = 'jgsuffu-v3-' + CACHE_VERSION;
const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './main.css',
  './manifest.json',
  './logo.png',
  './click.mp3',
  './pop.mp3'
];

// --- Install: cache app shell ---
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

// --- Activate: clean up old caches ---
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// --- Fetch: stale-while-revalidate for JS/CSS, cache-first for images ---
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.registration.scope)) return;
  // Don't intercept Firebase API requests
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('googleapis.com')) return;

  const url = new URL(event.request.url);
  const isAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (isAsset) {
    // Stale-while-revalidate: serve cached, update in background
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          const fetchPromise = fetch(event.request).then(function(networkResponse) {
            if (networkResponse && networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(function() { return cached; });
          return cached || fetchPromise;
        });
      })
    );
  } else {
    // Cache-first for images and other assets
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request);
      })
    );
  }
});

// --- Push Notifications ---
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'logo.png',
      badge: 'logo.png',
      vibrate: [100, 50, 100],
      data: { url: self.registration.scope }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Suffu Says...', options)
    );
  }
});

// --- Notification Click: focus or open the app ---
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(self.registration.scope);
      }
    })
  );
});
