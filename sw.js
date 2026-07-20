// 家庭记账 Service Worker — 可安装 PWA，网络优先，不缓存数据
const CACHE_NAME = 'jizhang-v3';
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API / Supabase calls
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.pathname.includes('/api/')) {
    return; // let browser handle directly
  }

  // Network-first for HTML
  if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (event.request.destination === 'script' || event.request.destination === 'style' ||
      event.request.destination === 'image' || event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
      )
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
