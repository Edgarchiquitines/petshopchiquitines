// ================================================================
// SERVICE WORKER — Pet Shop Chiquitines
// La constante CACHE_VERSION se genera automáticamente con la fecha
// y hora de compilación del SW. Para forzar que todos los usuarios
// reciban archivos nuevos, basta con guardar (tocar) este archivo.
// ================================================================
'use strict';

// ── Versión automática: se actualiza sola cada vez que guardás el SW
// Formato: chiquitines-YYYYMMDD-HHMM  (ej: chiquitines-20260320-1430)
const _now = new Date();
const _pad = n => String(n).padStart(2, '0');
const CACHE_VERSION = `chiquitines-${_now.getFullYear()}${_pad(_now.getMonth()+1)}${_pad(_now.getDate())}-${_pad(_now.getHours())}${_pad(_now.getMinutes())}`;

const OFFLINE_URL = 'offline.html';

const PRECACHE_URLS = [
    'index.html',
    'products.html',
    'cart.html',
    'offline.html',
    'styles.css',
    'app.js',
    'manifest.json',
    'assets/logo.webp',
    'assets/whatsapp.png',
    'assets/favicon.ico',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'products.json',
];

// ── Instalación ──────────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => Promise.allSettled(
                PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
            ))
            .then(() => self.skipWaiting())
    );
});

// ── Activación: limpiar caches anteriores ────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Ignorar scripts internos de CDN
    if (url.pathname.includes('/cdn-cgi/')) return;

    // URLs externas (Unsplash, wa.me, etc.) → solo red, sin caché
    if (url.origin !== self.location.origin) {
        event.respondWith(
            fetch(request).catch(() => new Response('', { status: 408, statusText: 'Network error' }))
        );
        return;
    }

    // products.json → network-first con caché de respaldo
    if (url.pathname.endsWith('products.json')) {
        event.respondWith(networkFirst(request, 'application/json', '[]'));
        return;
    }

    // Assets estáticos → stale-while-revalidate
    if (/\.(css|js|webp|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Páginas HTML → network-first con fallback offline
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirstHtml(request));
        return;
    }

    event.respondWith(networkFirst(request, null, null));
});

// ── Estrategias de caché ─────────────────────────────────────────

async function networkFirst(request, fallbackContentType, fallbackBody) {
    const cache = await caches.open(CACHE_VERSION);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (_) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (fallbackContentType && fallbackBody !== null) {
            return new Response(fallbackBody, { headers: { 'Content-Type': fallbackContentType } });
        }
        return new Response('', { status: 408, statusText: 'Network error' });
    }
}

async function staleWhileRevalidate(request) {
    const cache  = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);

    return cached || await fetchPromise || new Response('', { status: 404 });
}

async function networkFirstHtml(request) {
    const cache = await caches.open(CACHE_VERSION);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (_) {
        const cached  = await cache.match(request);
        if (cached)   return cached;
        const index   = await cache.match('index.html');
        if (index)    return index;
        const offline = await cache.match(OFFLINE_URL);
        return offline || new Response(
            '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Sin conexión</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem;background:#000;color:#fff"><h1>Sin conexión</h1><p>Revisá tu conexión e intentá de nuevo.</p><button onclick="location.reload()" style="background:#FF6B35;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:.5rem;font-size:1rem;cursor:pointer;margin-top:1rem">Reintentar</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}