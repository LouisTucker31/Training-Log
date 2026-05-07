const CACHE_NAME = 'training-log-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/navbar.css',
  '/css/base.css',
  '/css/home.css',
  '/css/log.css',
  '/css/training.css',
  '/css/insights.css',
  '/css/profile.css',
  '/js/navbar.js',
  '/js/router.js',
  '/js/data.js',
  '/js/store.js',
  '/js/home.js',
  '/js/log.js',
  '/js/training.js',
  '/js/insights.js',
  '/js/profile.js'
];

// Install — cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache first, network fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});