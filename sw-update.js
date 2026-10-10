/**
 * SERVICE WORKER CON ACTUALIZACIÓN AUTOMÁTICA
 * 
 * - Auto-update cada 5-10 segundos
 * - Detecta cambios en archivos
 * - Recarga PWA cuando hay cambios
 */

'use strict';

const CACHE_NAME = 'chiquitines-' + new Date().toISOString().split('T')[0].replace(/-/g, '');

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/cart.html',
    '/products.html',
    '/styles.css',
    '/app-styles.css',
    '/app.js',
    '/app-mode.js',
    '/app-native.css',
    '/app-native.js',
    '/promo-modal-mejorado.css',
    '/promo-modal-mejorado.js',
    '/promo-config.js',
    '/pwa-auto-update.css',
    '/pwa-auto-update.js',
    '/mejoras.css',
    '/mejoras.js',
    '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return Promise.all(
                    PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activar nuevo Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            );
        }).then(() => {
            // Notificar a clientes que hay actualización
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'UPDATE_AVAILABLE'
                    });
                });
            });
        })
    );

    return self.clients.claim();
});

// Mensaje desde clientes
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Estrategia de caché
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network first para JSON (productos)
    if (url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const cache = caches.open(CACHE_NAME);
                        cache.then((c) => c.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache first para assets (imágenes, CSS, JS)
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then((response) => response || fetch(event.request))
                .catch(() => {
                    // Fallback offline
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // Network first para POST, PUT, DELETE
    event.respondWith(fetch(event.request));
});
