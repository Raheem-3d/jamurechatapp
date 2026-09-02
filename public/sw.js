/* public/sw.js — JamureChat PWA Service Worker */

const CACHE_NAME = 'jamurechat-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
  '/placeholder-logo.svg',
];

// Install: Cache essential assets & immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache failed for some assets:', err);
      });
    })
  );
});

// Activate: Clean up older caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      }),
      self.clients.claim(),
    ])
  );
});

// Fetch: Smart network-first for pages and API, cache-first for static immutable assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache Socket.io, API requests, Cloudinary, or non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.includes('/u/') ||
    url.hostname.includes('cloudinary.com') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // 2. Static immutable Next.js chunks & icons (Cache-first / Stale-while-revalidate)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Navigation / HTML pages: Network first, fallback to offline cache if network fails
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'JamureChat';
    const options = {
      body: data.body || 'You have a new message',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data.data || { url: '/' },
      vibrate: [100, 50, 100],
      tag: data.tag || 'jamurechat-notification',
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push notification:', err);
  }
});

// Buzz / Notification Click => Focus or open the right tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/';
  const target = new URL(rawUrl, self.location.origin).toString();

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // 1) Exact match? focus it.
    const exact = clients.find((c) => c.url === target);
    if (exact) {
      await exact.focus();
      return;
    }

    // 2) Same-origin? pick one, focus + navigate if needed.
    const sameOrigin = clients.find((c) => {
      try {
        return new URL(c.url).origin === self.location.origin;
      } catch {
        return false;
      }
    });

    if (sameOrigin) {
      await sameOrigin.focus();
      if (sameOrigin.url !== target) sameOrigin.navigate(target);
      return;
    }

    // 3) No tab? open new one.
    await self.clients.openWindow(target);
  })());
});
