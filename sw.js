/* ========================================
   DIYET PROGRAMI - Service Worker
   PWA offline destek ve önbellek yönetimi
   ======================================== */

const CACHE_NAME = 'diyet-programi-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
];

const JSON_FILES = [
    '/diet_jsons/dietprogram1.json',
    '/diet_jsons/dietprogram2.json',
    '/diet_jsons/dietprogram3_fatburn.json'
];

// Install event - statik varlıkları önbelleğe al
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate event - eski önbellekleri temizle
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// Fetch event - ağ isteklerini yakala ve önbellekten servis et
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // JSON dosyaları için: önce ağdan, yoksa önbellekten
    if (JSON_FILES.includes(url.pathname)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Başarılı yanıtı önbelleğe al
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    return response;
                })
                .catch(() => {
                    // Ağ hatası durumunda önbellekten dene
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Diğer varlıklar için: önce önbellekten, sonra ağdan
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Yeni varlıkları önbelleğe al (HTML, CSS, JS)
                        if (response.ok && response.type === 'basic') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    });
            })
    );
});