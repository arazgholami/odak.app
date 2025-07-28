// Service Worker for Odak App

const CACHE_NAME = 'odak-app-cache-v=2.6';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/styles/style.css',
  '/assets/scripts/script.js',
  '/assets/images/odak.svg',
  '/assets/images/odak.svg',
  '/assets/images/odak-paper.png',
  '/assets/images/dark-paper.png',
  '/assets/images/white-paper.png',
  '/manifest.json',
  '/assets/fonts/Vazirmatn-Regular.woff2',
  '/assets/fonts/Vazirmatn-Bold.woff2',
  '/assets/webfonts/fa-solid-900.ttf',
  '/assets/webfonts/fa-solid-900.woff2',
  '/assets/sounds/type-machine/key-new-01.mp3',
  '/assets/sounds/type-machine/key-new-02.mp3',
  '/assets/sounds/type-machine/key-new-03.mp3',
  '/assets/sounds/type-machine/key-new-04.mp3',
  '/assets/sounds/type-machine/key-new-05.mp3',
  '/assets/sounds/type-machine/space-new.mp3',
  '/assets/sounds/type-machine/backspace.mp3',
  '/assets/sounds/type-machine/return-new.mp3',
  '/assets/sounds/type-machine/scrollUp.mp3',
  '/assets/sounds/type-machine/scrollDown.mp3',
  '/assets/scripts/draggable-image.js',
  '/assets/scripts/wysiwyg-markdown-editor.js',
  '/assets/vendor/bootstrap.min.css',
  '/assets/vendor/font-awesome.min.css',
  '/assets/vendor/bootstrap.bundle.min.js'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request to prevent consuming it
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to store in cache and return it
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return a fallback page if offline and page not in cache
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // For other requests, try to return a cached version
            return caches.match(event.request.url)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }
                
                // If no cached version exists, return a basic offline page
                if (event.request.headers.get('accept').includes('text/html')) {
                  return caches.match('/index.html');
                }
                
                // For other types of requests, return a basic offline response
                return new Response('Offline content not available', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
          });
      })
  );
}); 