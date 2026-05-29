// Service Worker for offline support and caching

const CACHE_NAME = 'discipline-planner-v1';
const urlsToCache = [
  '/discipline-life-planner/',
  '/discipline-life-planner/index.html',
  '/discipline-life-planner/manifest.json',
  '/discipline-life-planner/sw.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache opened');
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Cache addAll error:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background Sync for future enhancements
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      fetch('/api/sync-tasks', {
        method: 'POST',
        body: JSON.stringify(JSON.parse(localStorage.getItem('tasks') || '{}'))
      }).catch(() => console.log('Sync failed, will retry'))
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Discipline Reminder!',
    icon: '/discipline-life-planner/icon-192.png',
    badge: '/discipline-life-planner/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'discipline-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Discipline Life Planner', options)
  );
});
