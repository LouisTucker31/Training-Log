const CACHE_NAME = 'training-log-v2';

const STATIC_ASSETS = [
  '/Training-Log/',
  '/Training-Log/index.html',
  '/Training-Log/manifest.json',
  '/Training-Log/css/navbar.css',
  '/Training-Log/css/base.css',
  '/Training-Log/css/home.css',
  '/Training-Log/css/log.css',
  '/Training-Log/css/training.css',
  '/Training-Log/css/insights.css',
  '/Training-Log/css/profile.css',
  '/Training-Log/js/navbar.js',
  '/Training-Log/js/router.js',
  '/Training-Log/js/data.js',
  '/Training-Log/js/store.js',
  '/Training-Log/js/home.js',
  '/Training-Log/js/log.js',
  '/Training-Log/js/training.js',
  '/Training-Log/js/insights.js',
  '/Training-Log/js/profile.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});