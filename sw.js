// ================================================================
// SERVICE WORKER — Pet Shop Chiquitines
// Cachea las páginas y productos visitados para uso offline.
// ================================================================

const CACHE_NAME  = 'chiquitines-v1';
const OFFLINE_URL = 'offline.html';

const PRECACHE_URLS = [
  'index.html',
  'products.html',
  'cart.html',
  'styles.css',
  'app.js',
  'offline.html',
  'assets/logo.webp',
  'assets/whatsapp.png',
  'assets/favicon.ico'
];

// ── Instalación ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

// ── Activación ───────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorar scripts de Cloudflare
  if (url.pathname.includes('/cdn-cgi/')) return;

  // URLs externas (Unsplash, etc.) → solo red
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response('')));
    return;
  }

  // JSON de productos → network-first, cachear resultado
  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Assets estáticos → cache-first con actualización en background
  if (/\.(css|js|webp|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }

  // Páginas HTML → network-first, cachear al visitar, fallback offline
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  event.respondWith(networkFirstWithCache(request));
});

// ── Estrategias ──────────────────────────────────────────────────

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Actualizar en background
    fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response));
    }).catch(() => null);
    return cached;
  }
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const indexCached = await cache.match('index.html');
    if (indexCached) return indexCached;
    const offlinePage = await cache.match(OFFLINE_URL);
    return offlinePage || new Response(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sin conexión</title></head><body style="font-family:sans-serif;text-align:center;padding:3rem;background:#000;color:#fff"><h1>😿 Sin conexión</h1><p>Revisá tu conexión e intentá de nuevo.</p><button onclick="location.reload()" style="background:#FF6B35;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:.5rem;font-size:1rem;cursor:pointer;margin-top:1rem">Reintentar</button></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}