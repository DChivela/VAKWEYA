const CACHE_VERSION = 'vakwetu-weya-pwa-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/logonovo-vakwetu.png',
  '/assets/hero-angola.png',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/pwa/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  await putInCache(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    await putInCache(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackUrl) {
      const fallbackResponse = await caches.match(fallbackUrl);

      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    throw error;
  }
}

async function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return;
  }

  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response);
}
