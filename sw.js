const CACHE_NAME = 'rosary-companion-v1.0.2';

// Install event - cache resources + skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      './',
      './index.html',
      './css/style.css',
      './js/script.js',
      './js/config.js',
      './images/rosary-optimized.svg',
      './images/rosary.svg',
      './favicon.ico',
      './manifest.json',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
    ]);
    await self.skipWaiting();
  })());
});

// Fetch event - network-first for HTML, cache-first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Prefer fresh HTML
  if (request.mode === 'navigate' || (request.destination === 'document')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', net.clone());
        return net;
      } catch {
        return (await caches.match('./index.html')) ||
               (await caches.match('index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // Static assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const net = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, net.clone());
    return net;
  })());
});

// Activate event - clear old caches + claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
    await clients.claim();
  })());
});

// Background sync for prayer completions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-prayer') {
    event.waitUntil(syncPrayerData());
  }
});

async function syncPrayerData() {
  // This would sync any pending prayer completions when back online
  console.log('Syncing prayer data...');
  // Implementation would go here to sync with Firebase
}

// Push notifications (for future prayer reminders)
self.addEventListener('push', event => {
  if (event.data) {
    const notificationData = event.data.json();
    
    const options = {
      body: notificationData.body || 'Time for your daily rosary',
      icon: '/images/rosary-optimized.svg',
      badge: '/images/rosary-optimized.svg',
      vibrate: [200, 100, 200],
      data: notificationData.data || {},
      actions: [
        {
          action: 'start-rosary',
          title: 'Start Rosary',
          icon: '/images/rosary-optimized.svg'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title || 'Rosary Companion', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'start-rosary') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});