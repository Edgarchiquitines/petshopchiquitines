'use strict';

// ── Cached Intl.NumberFormat instances (avoids re-creation on every call) ──
const _fmtPYG = new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
});

// ── Safe localStorage helpers ────────────────────────────────────────────────
function _lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch (e) { return fallback; }
}
function _lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
}

// CART MANAGEMENT
function getCart() {
    return _lsGet('cart', []);
}

function saveCart(cart) {
    _lsSet('cart', cart);
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = totalItems;
    }
}

// ── Umbral para mostrar badge "Últimas unidades" ─────────────────
const LOW_STOCK_THRESHOLD = 5;

function addToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);

    // ── Validación de stock ──────────────────────────────────────
    // stock === 0 o undefined/null → no se puede agregar
    if (!product.stock || product.stock <= 0) return;

    if (existingItem) {
        // Ya en el carrito: verificar que no supere el stock disponible
        if (existingItem.quantity >= product.stock) {
            showStockLimitNotification(product);
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart(cart);
    trackUserActivity('cart', product);
    showAddedToCartNotification(product);
}

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => String(item.id) !== String(productId));
    saveCart(updatedCart);
}

function updateQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(item => String(item.id) === String(productId));

    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1 || newQuantity > item.stock) return false;
        item.quantity = newQuantity;
        saveCart(cart);
        return true;
    }

    return false;
}

// ── Price Formatting ─────────────────────────────────────────────
function formatPrice(price) {
    return _fmtPYG.format(price);
}

// ── Normalize product: handles both discount modes ───────────────
// Mode 1: discountPercent set → auto-calculate price from originalPrice
// Mode 2: price < originalPrice set manually → auto-enable isOnSale
function normalizeProduct(p) {
    const prod = { ...p };

    // Mode 1: discountPercent provided → derive price from originalPrice
    if (prod.discountPercent && prod.discountPercent > 0 && prod.originalPrice) {
        prod.price = Math.round(prod.originalPrice * (1 - prod.discountPercent / 100));
        prod.isOnSale = true;
    }

    // Mode 2: price < originalPrice but isOnSale not set → auto-enable
    if (prod.originalPrice && prod.price < prod.originalPrice && !prod.isOnSale) {
        prod.isOnSale = true;
    }

    // Safety: if isOnSale but no real discount, disable it
    if (prod.isOnSale && (!prod.originalPrice || prod.price >= prod.originalPrice)) {
        prod.isOnSale = false;
    }

    return prod;
}

// ── Product Card Creation ────────────────────────────────────────
function createProductCard(product) {
    const p = normalizeProduct(product);
    const hasDiscount = p.isOnSale && p.originalPrice && p.price < p.originalPrice;
    const discountPercent = hasDiscount
        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
        : 0;

    // ── Badge "Últimas unidades" ─────────────────────────────────
    // Se muestra si stock > 0 y stock <= LOW_STOCK_THRESHOLD
    const isLowStock = p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;

    const imgSrc = p.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400';
    const favActive = isFavorite(p.id);

    return `
        <div class="product-card" role="article" aria-label="${p.name}">
            <div class="product-image" onclick="openImageZoom('${imgSrc.replace(/'/g, "\\'")}', '${p.name.replace(/'/g, "\\'")}')">
                <button class="fav-btn${favActive ? ' fav-btn--active' : ''}" data-id="${p.id}"
                    aria-label="${favActive ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                    aria-pressed="${favActive}"
                    onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(p).replace(/"/g,'&quot;')})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${favActive ? '#FF6B35' : 'none'}" stroke="${favActive ? '#FF6B35' : 'currentColor'}" stroke-width="2" aria-hidden="true" focusable="false">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <img src="${imgSrc}" alt="${p.name}" width="400" height="300" loading="lazy" decoding="async">
                <div class="zoom-hint" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" focusable="false">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </div>
                ${hasDiscount ? `
                    <div class="discount-badge" aria-label="Descuento ${discountPercent}%">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                        <span>-${discountPercent}%</span>
                    </div>
                ` : ''}
                ${isLowStock ? `
                    <div class="low-stock-badge" aria-label="Últimas unidades">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" focusable="false">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <span>¡Últimas!</span>
                    </div>
                ` : ''}
                ${p.stock === 0 ? `
                    <div class="out-of-stock-overlay" aria-label="Sin stock">SIN STOCK</div>
                ` : ''}
            </div>
            <div class="product-content">
                <h3 class="product-name">${p.name}</h3>
                <div class="product-meta">
                    <span class="product-weight">${p.weight}</span>
                    <span class="product-pet-type">${p.petType}</span>
                </div>
                <div class="product-price" aria-label="Precio">
                    ${hasDiscount ? `
                        <p class="original-price"><s>${formatPrice(p.originalPrice)}</s></p>
                        <p class="current-price">${formatPrice(p.price)}</p>
                    ` : `
                        <p class="regular-price">${formatPrice(p.price)}</p>
                    `}
                </div>
                <div class="product-card-actions">
                    <button
                        class="add-to-cart-btn"
                        onclick="addToCart(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                        aria-label="${p.stock === 0 ? 'Sin stock' : 'Agregar ' + p.name + ' al carrito'}"
                        ${p.stock === 0 ? 'disabled aria-disabled="true"' : ''}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span>${p.stock === 0 ? 'Sin Stock' : 'Agregar'}</span>
                    </button>
                    <button class="share-wa-btn" onclick="shareProductWA(${JSON.stringify(p).replace(/"/g, '&quot;')})" aria-label="Compartir ${p.name} por WhatsApp" title="Compartir por WhatsApp">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ── Compartir producto por WhatsApp ──────────────────────────────
function shareProductWA(product) {
    const price = _fmtPYG.format(product.price);
    const hasDiscount = product.isOnSale && product.originalPrice;
    const originalPrice = hasDiscount ? _fmtPYG.format(product.originalPrice) : null;

    let msg = `🐾 *${product.name}*\n`;
    if (product.brand)  msg += `Marca: ${product.brand}\n`;
    if (product.weight) msg += `Peso: ${product.weight}\n`;
    if (hasDiscount)    msg += `~~${originalPrice}~~ → *${price}* 🔥\n`;
    else                msg += `Precio: *${price}*\n`;
    msg += `\n¡Encontralo en Petshop Chiquitines! 🏪\n`;
    msg += `📍 Av. Peru y Gines, Asunción\n`;
    msg += `👉 https://petshopchiquitines.com/products.html`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// IMAGE ZOOM LIGHTBOX
function openImageZoom(src, alt) {
    if (document.getElementById('imgZoomOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'imgZoomOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Zoom de imagen: ' + alt);
    overlay.innerHTML = `
        <div class="imgzoom-backdrop"></div>
        <div class="imgzoom-container">
            <img class="imgzoom-img" src="${src}" alt="${alt}" draggable="false">
            <button class="imgzoom-close" aria-label="Cerrar zoom">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" focusable="false">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="imgzoom-hint" aria-hidden="true">Pellizca para hacer zoom</div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('imgzoom--open'));

    const img      = overlay.querySelector('.imgzoom-img');
    const closeBtn = overlay.querySelector('.imgzoom-close');
    const hint     = overlay.querySelector('.imgzoom-hint');

    setTimeout(() => hint.classList.add('imgzoom-hint--hidden'), 2000);

    function closeZoom() {
        overlay.classList.remove('imgzoom--open');
        overlay.classList.add('imgzoom--closing');
        setTimeout(() => overlay.remove(), 250);
    }

    closeBtn.addEventListener('click', closeZoom);
    overlay.querySelector('.imgzoom-backdrop').addEventListener('click', closeZoom);

    function onKeyDown(e) {
        if (e.key === 'Escape') { closeZoom(); document.removeEventListener('keydown', onKeyDown); }
    }
    document.addEventListener('keydown', onKeyDown);

    let scale = 1, minScale = 1, maxScale = 5, posX = 0, posY = 0;
    let lastDist = 0, isDragging = false, dragStartX = 0, dragStartY = 0;

    function applyTransform() {
        img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    }

    function clampPos() {
        if (scale <= 1) { posX = 0; posY = 0; return; }
        const rect   = img.getBoundingClientRect();
        const parent = img.parentElement.getBoundingClientRect();
        const overX  = Math.max(0, (rect.width  - parent.width)  / 2);
        const overY  = Math.max(0, (rect.height - parent.height) / 2);
        posX = Math.min(overX, Math.max(-overX, posX));
        posY = Math.min(overY, Math.max(-overY, posY));
    }

    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lastDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        } else if (e.touches.length === 1 && scale > 1) {
            isDragging = true;
            dragStartX = e.touches[0].clientX - posX;
            dragStartY = e.touches[0].clientY - posY;
        }
    }, { passive: true });

    img.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist  = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const delta = dist / lastDist;
            scale = Math.min(maxScale, Math.max(minScale, scale * delta));
            lastDist = dist;
            clampPos(); applyTransform();
        } else if (e.touches.length === 1 && isDragging) {
            posX = e.touches[0].clientX - dragStartX;
            posY = e.touches[0].clientY - dragStartY;
            clampPos(); applyTransform();
        }
    }, { passive: false });

    img.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) isDragging = false;
        if (scale <= 1) { scale = 1; posX = 0; posY = 0; applyTransform(); }
    }, { passive: true });

    let lastTap = 0;
    img.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            scale = scale > 1 ? 1 : 2.5;
            if (scale === 1) { posX = 0; posY = 0; }
            applyTransform();
        }
        lastTap = now;
    }, { passive: true });

    overlay.querySelector('.imgzoom-container').addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.min(maxScale, Math.max(minScale, scale - e.deltaY * 0.002));
        clampPos(); applyTransform();
    }, { passive: false });
}

// fitProductNames — optimizado con ResizeObserver
const _nameObservers = new WeakMap();

function _fitOneName(el) {
    const isDesktop = window.innerWidth >= 768;
    const MAX_FONT  = isDesktop ? 17 : 15;
    const MIN_FONT  = 12;

    el.style.fontSize        = MAX_FONT + 'px';
    el.style.webkitLineClamp = 'unset';
    el.style.overflow        = 'visible';
    el.style.display         = 'block';
    el.style.maxHeight       = 'none';
    el.style.whiteSpace      = 'normal';

    let size = MAX_FONT;
    while (size > MIN_FONT) {
        el.style.fontSize = size + 'px';
        const lh       = parseFloat(getComputedStyle(el).lineHeight) || size * 1.4;
        const twoLines = lh * 2 + 2;
        if (el.scrollHeight <= twoLines) break;
        size--;
    }
}

function fitProductNames() {
    document.querySelectorAll('.product-name').forEach(_fitOneName);
}

function _observeCardResize(nameEl) {
    const card = nameEl.closest('.product-card');
    if (!card || _nameObservers.has(card)) return;

    const ro = new ResizeObserver(() => {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => _fitOneName(nameEl), { timeout: 300 });
        } else {
            setTimeout(() => _fitOneName(nameEl), 80);
        }
    });
    ro.observe(card);
    _nameObservers.set(card, ro);
}

function fitAndObserveProductNames() {
    document.querySelectorAll('.product-name').forEach(el => {
        _fitOneName(el);
        if ('ResizeObserver' in window) _observeCardResize(el);
    });
}

function observeProductGrid() {
    const grids = document.querySelectorAll('#productsGrid, #recommendedGrid');
    if (!grids.length) return;

    const observer = new MutationObserver(() => {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(fitAndObserveProductNames, { timeout: 500 });
        } else {
            setTimeout(fitAndObserveProductNames, 100);
        }
    });

    grids.forEach(grid => observer.observe(grid, { childList: true, subtree: false }));
}

// NOTIFICACIONES
function showAddedToCartNotification(product) {
    const existing = document.getElementById('atcNotif');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'atcNotif';
    notif.setAttribute('role', 'status');
    notif.setAttribute('aria-live', 'polite');
    notif.setAttribute('aria-atomic', 'true');
    notif.innerHTML = `
        <div class="atcn-inner">
            <div class="atcn-check" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400'}"
                alt="" class="atcn-img" width="36" height="36" loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400'" aria-hidden="true">
            <div class="atcn-text">
                <span class="atcn-label">¡Agregado!</span>
                <span class="atcn-name">${product.name}</span>
            </div>
            <a href="cart.html" class="atcn-btn">Ver carrito</a>
        </div>
    `;
    document.body.appendChild(notif);
    requestAnimationFrame(() => notif.classList.add('atcn--visible'));

    setTimeout(() => {
        notif.classList.remove('atcn--visible');
        setTimeout(() => notif.remove(), 350);
    }, 3000);
}

// ── Notificación de límite de stock ──────────────────────────────
function showStockLimitNotification(product) {
    const existing = document.getElementById('atcNotif');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'atcNotif';
    notif.setAttribute('role', 'alert');
    notif.setAttribute('aria-live', 'assertive');
    notif.setAttribute('aria-atomic', 'true');
    notif.innerHTML = `
        <div class="atcn-inner atcn-inner--warn">
            <div class="atcn-check atcn-check--warn" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true" focusable="false">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>
            <div class="atcn-text">
                <span class="atcn-label atcn-label--warn">Sin más unidades</span>
                <span class="atcn-name">Solo hay ${product.stock} disponible${product.stock !== 1 ? 's' : ''}</span>
            </div>
            <a href="cart.html" class="atcn-btn">Ver carrito</a>
        </div>
    `;
    document.body.appendChild(notif);
    requestAnimationFrame(() => notif.classList.add('atcn--visible'));

    setTimeout(() => {
        notif.classList.remove('atcn--visible');
        setTimeout(() => notif.remove(), 350);
    }, 3000);
}

// ── Notificación genérica ────────────────────────────────────────
function showNotification(message) {
    const notification = document.createElement('div');
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.style.cssText = `
        position: fixed; top: 5rem; right: 1rem;
        background-color: #10b981; color: white;
        padding: 1rem 1.5rem; border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999; animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ── Mobile Menu + inicialización ─────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu    = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            const isOpen = mobileMenu.classList.toggle('active');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
        });
        mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    updateCartCount();
    injectPanels();
    updateFavCount();
    observeProductGrid();

    if (!('ResizeObserver' in window)) {
        window.addEventListener('resize', () => {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(fitProductNames, { timeout: 300 });
            } else {
                setTimeout(fitProductNames, 100);
            }
        }, { passive: true });
    }
});

// CSS animations + estilos de badges
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn  { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0);    opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0);    opacity: 1; } to { transform: translateX(100%); opacity: 0; } }

    .zoom-hint { display: none; }
    @media (hover: none) and (pointer: coarse) {
        .zoom-hint {
            display: flex;
            position: absolute;
            bottom: 0.4rem;
            right: 0.4rem;
            background: rgba(0,0,0,0.55);
            color: #fff;
            font-size: 0.6rem;
            padding: 0.2rem 0.4rem;
            border-radius: 0.3rem;
            align-items: center;
            gap: 0.25rem;
            pointer-events: none;
            transition: opacity 0.3s;
        }
    }
    .imgzoom-hint--hidden { opacity: 0 !important; }

    .low-stock-badge {
        position: absolute;
        bottom: 0.4rem;
        left: 0.4rem;
        background-color: #f59e0b;
        color: #ffffff;
        padding: 0.2rem 0.4rem;
        border-radius: 9999px;
        font-size: 0.65rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.2rem;
        pointer-events: none;
        z-index: 4;
        line-height: 1;
    }
    .low-stock-badge svg { flex-shrink: 0; }

    .atcn-inner--warn { background: #1c1c1c; }
    .atcn-check--warn { background: #f59e0b; }
    .atcn-label--warn { color: #fbbf24; }

    .side-panel {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .panel-header { flex-shrink: 0; }
    .panel-body {
        flex: 1 1 0;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .order-history-card {
        position: static !important;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
        background: #fff;
        display: flex;
        flex-direction: column;
    }
    .order-history-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
    }
    .order-history-num  { font-weight: 700; font-size: 0.9rem; color: #111; display: block; }
    .order-history-date { font-size: 0.72rem; color: #9ca3af; display: block; margin-top: 0.1rem; }
    .order-history-total { font-weight: 700; color: #FF6B35; font-size: 0.95rem; white-space: nowrap; flex-shrink: 0; }
    .order-history-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 0.75rem;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #f3f4f6;
        font-size: 0.75rem;
        color: #6b7280;
        flex-shrink: 0;
    }
    .order-history-items {
        list-style: none;
        padding: 0.6rem 1rem 0.75rem;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        flex-shrink: 0;
    }
    .order-history-items li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
    .order-item-name  { flex: 1; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .order-item-qty   { color: #9ca3af; flex-shrink: 0; }
    .order-item-price { font-weight: 600; color: #111; flex-shrink: 0; }
    .order-history-footer {
        padding: 0.6rem 1rem 0.75rem;
        border-top: 1px solid #f3f4f6;
        flex-shrink: 0;
    }
    .order-repeat-btn {
        width: 100%;
        display: flex; align-items: center; justify-content: center; gap: 0.45rem;
        background-color: #FF6B35; color: #fff;
        border: none; border-radius: 0.5rem;
        padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600;
        cursor: pointer; transition: background-color 0.2s;
    }
    .order-repeat-btn:hover  { background-color: #E55A2B; }
    .order-repeat-btn:active { transform: scale(0.97); }

    .panel-product-row {
        position: static !important;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
    }

    #atcNotif {
        position: fixed; top: 5rem; right: 1rem;
        z-index: 9999; opacity: 0;
        transform: translateX(110%);
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        pointer-events: none;
    }
    #atcNotif.atcn--visible { opacity: 1; transform: translateX(0); pointer-events: auto; }
    .atcn-inner {
        display: flex; align-items: center; gap: 0.6rem;
        background: #111; color: #fff;
        padding: 0.65rem 0.85rem; border-radius: 0.75rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.28);
        min-width: 240px; max-width: 320px;
    }
    .atcn-check { width:1.5rem; height:1.5rem; border-radius:9999px; background:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff; }
    .atcn-img   { width:2.25rem; height:2.25rem; object-fit:cover; border-radius:0.375rem; flex-shrink:0; background:#333; }
    .atcn-text  { flex:1; min-width:0; display:flex; flex-direction:column; gap:0.05rem; }
    .atcn-label { font-size:0.7rem; font-weight:700; color:#10b981; text-transform:uppercase; letter-spacing:0.04em; }
    .atcn-name  { font-size:0.78rem; font-weight:500; color:#e5e7eb; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .atcn-btn   { flex-shrink:0; background:#FF6B35; color:#fff; text-decoration:none; font-size:0.72rem; font-weight:700; padding:0.35rem 0.65rem; border-radius:0.5rem; transition:background 0.15s; white-space:nowrap; }
    .atcn-btn:hover { background:#E55A2B; }
    @media (max-width: 767px) {
        #atcNotif { top:auto; bottom:5rem; right:0.75rem; left:0.75rem; }
        .atcn-inner { max-width:100%; }
    }

    .product-name {
        overflow: visible !important;
        display: block !important;
        -webkit-line-clamp: unset !important;
        line-clamp: unset !important;
        max-height: none !important;
        white-space: normal !important;
        word-break: break-word;
    }
`;
document.head.appendChild(style);

// ════════════════════════════════════════════════════════════════
// FAVORITOS (WISHLIST)
// FIX: todas las comparaciones de ID usan String() para evitar
//      discrepancias entre número y string que rompían el toggle/remove.
// ════════════════════════════════════════════════════════════════

function getFavorites() { return _lsGet('favorites', []); }

function saveFavorites(favs) { _lsSet('favorites', favs); updateFavCount(); }

function toggleFavorite(product) {
    const favs = getFavorites();
    // FIX: comparar como strings para evitar 123 !== "123"
    const idx  = favs.findIndex(f => String(f.id) === String(product.id));
    if (idx >= 0) {
        favs.splice(idx, 1);
        showNotification('Eliminado de favoritos');
    } else {
        favs.push(product);
        showNotification('❤️ Guardado en favoritos');
        trackUserActivity('favorite', product);
    }
    saveFavorites(favs);
    // FIX: actualizar todos los botones con este id
    document.querySelectorAll(`.fav-btn[data-id="${product.id}"]`).forEach(btn => {
        refreshFavBtn(btn, product.id);
    });
}

function isFavorite(productId) {
    // FIX: comparar como strings
    return getFavorites().some(f => String(f.id) === String(productId));
}

function refreshFavBtn(btn, productId) {
    const active = isFavorite(productId);
    btn.classList.toggle('fav-btn--active', active);
    btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
    btn.setAttribute('aria-pressed', active);
    btn.querySelector('svg').setAttribute('fill', active ? '#FF6B35' : 'none');
    btn.querySelector('svg').setAttribute('stroke', active ? '#FF6B35' : 'currentColor');
}

function updateFavCount() {
    const count = getFavorites().length;
    document.querySelectorAll('.fav-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

// ── Modal favoritos ───────────────────────────────────────────────
function openFavoritesModal() {
    closePanels();
    const favs  = getFavorites();
    const modal = document.getElementById('favoritesModal');
    if (!modal) return;

    const body = modal.querySelector('.panel-body');
    if (!favs.length) {
        body.innerHTML = `
            <div class="panel-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <p>No tenés productos guardados</p>
                <a href="products.html">Ver productos</a>
            </div>`;
    } else {
        body.innerHTML = favs.map(p => {
            const img = p.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400';
            // FIX: usar data-fav-id como atributo para evitar problemas de tipos en onclick
            return `
            <div class="panel-product-row" id="fav-row-${p.id}" data-fav-id="${p.id}">
                <img src="${img}" alt="${p.name}" class="panel-product-img" width="56" height="56" loading="lazy">
                <div class="panel-product-info">
                    <span class="panel-product-name">${p.name}</span>
                    <span class="panel-product-brand">${p.brand || ''}</span>
                    <span class="panel-product-price">${formatPrice(p.price)}</span>
                </div>
                <div class="panel-product-actions">
                    <button class="panel-add-btn" onclick="addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')})" aria-label="Agregar ${p.name} al carrito" title="Agregar al carrito">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </button>
                    <button class="panel-remove-btn" onclick="removeFavFromPanel(this)" data-fav-id="${p.id}" aria-label="Eliminar ${p.name} de favoritos" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    modal.classList.add('panel--open');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('panelBackdrop')?.classList.add('panel--open');
    const fab = document.querySelector('.whatsapp-fab');
    if (fab) fab.style.display = 'none';
}

// FIX PRINCIPAL: ahora recibe el botón (this) y lee el id desde el atributo data-fav-id,
// lo que garantiza que siempre tenemos el valor correcto sin importar el tipo.
function removeFavFromPanel(btn) {
    const productId = btn.dataset.favId;
    if (!productId) return;

    // FIX: comparar como strings
    const favs = getFavorites().filter(f => String(f.id) !== String(productId));
    saveFavorites(favs);

    // Animar y remover la fila
    const row = document.getElementById('fav-row-' + productId);
    if (row) {
        row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => { row.remove(); checkFavPanelEmpty(); }, 200);
    } else {
        checkFavPanelEmpty();
    }

    // Actualizar botones de corazón en las tarjetas de producto
    document.querySelectorAll(`.fav-btn[data-id="${productId}"]`).forEach(b => refreshFavBtn(b, productId));
}

function checkFavPanelEmpty() {
    const body = document.querySelector('#favoritesModal .panel-body');
    if (body && !body.querySelector('.panel-product-row')) {
        body.innerHTML = `
            <div class="panel-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <p>No tenés productos guardados</p>
                <a href="products.html">Ver productos</a>
            </div>`;
    }
}

// HISTORIAL DE PEDIDOS
function saveOrder(orderData) {
    const orders = _lsGet('orderHistory', []);
    orders.unshift(orderData);
    if (orders.length > 20) orders.splice(20);
    _lsSet('orderHistory', orders);
    if (orderData.items) orderData.items.forEach(item => trackUserActivity('order', item));
}

function getOrders() { return _lsGet('orderHistory', []); }

function openOrdersModal() {
    closePanels();
    const orders = getOrders();
    const modal  = document.getElementById('ordersModal');
    if (!modal) return;

    const body = modal.querySelector('.panel-body');
    if (!orders.length) {
        body.innerHTML = `
            <div class="panel-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="1" ry="1"></rect></svg>
                <p>Todavía no realizaste ningún pedido</p>
                <a href="products.html">Ver productos</a>
            </div>`;
    } else {
        body.innerHTML = orders.map((o, i) => `
            <div class="order-history-card">
                <div class="order-history-header">
                    <div>
                        <span class="order-history-num">Pedido #${orders.length - i}</span>
                        <span class="order-history-date">${o.date}</span>
                    </div>
                    <span class="order-history-total">${formatPrice(o.total)}</span>
                </div>
                <div class="order-history-meta">
                    <span>👤 ${o.customerName}</span>
                    <span>${o.deliveryMethod === 'Envio por Bolt' ? '🚚 Envio por Bolt' : '🏠 Retiro'}</span>
                    <span>${o.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia'}</span>
                </div>
                <ul class="order-history-items" aria-label="Productos del pedido">
                    ${o.items.map(it => `
                        <li>
                            <span class="order-item-name">${it.name}</span>
                            <span class="order-item-qty">x${it.quantity}</span>
                            <span class="order-item-price">${formatPrice(it.price * it.quantity)}</span>
                        </li>`).join('')}
                </ul>
                <div class="order-history-footer">
                    <button class="order-repeat-btn" onclick="reOrderToCart(${i})" aria-label="Repetir pedido ${orders.length - i}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 .49-4.95"></path>
                        </svg>
                        Repetir pedido
                    </button>
                </div>
            </div>`).join('');
    }

    modal.classList.add('panel--open');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('panelBackdrop')?.classList.add('panel--open');
    const fab = document.querySelector('.whatsapp-fab');
    if (fab) fab.style.display = 'none';
}

// ── reOrderToCart ─────────────────────────────────────────────────
async function reOrderToCart(orderIndex) {
    const orders = getOrders();
    const order  = orders[orderIndex];
    if (!order) return;

    let freshProducts = (typeof allProducts !== 'undefined' && allProducts.length)
        ? allProducts
        : null;

    if (!freshProducts) {
        freshProducts = _lsGet('productsCache', null);
    }

    if (!freshProducts) {
        try {
            freshProducts = await fetch('products.json').then(r => r.json());
            _lsSet('productsCache', freshProducts);
        } catch(e) {
            freshProducts = null;
        }
    }

    const newCart = order.items.map(it => {
        if (freshProducts) {
            const fresh = freshProducts.find(p => String(p.id) === String(it.id));
            if (fresh) {
                const qty = fresh.stock > 0
                    ? Math.min(it.quantity, fresh.stock)
                    : 0;
                if (qty <= 0) return null;
                return { ...fresh, quantity: qty };
            }
        }
        return { ...it };
    }).filter(Boolean);

    if (!newCart.length) {
        showNotification('⚠️ Ningún producto del pedido tiene stock disponible');
        return;
    }

    _lsSet('cart', newCart);
    updateCartCount();
    closePanels();
    showNotification('🛒 Pedido cargado en el carrito');
    setTimeout(() => { window.location.href = 'cart.html'; }, 900);
}

// ── Cerrar paneles ────────────────────────────────────────────────
function closePanels() {
    document.querySelectorAll('.side-panel').forEach(p => {
        p.classList.remove('panel--open');
        p.setAttribute('aria-hidden', 'true');
    });
    document.getElementById('panelBackdrop')?.classList.remove('panel--open');
    const fab = document.querySelector('.whatsapp-fab');
    if (fab) fab.style.display = '';
}

// ── Inyectar paneles + backdrop ──────────────────────────────────
function injectPanels() {
    if (document.getElementById('favoritesModal')) return;

    const backdrop = document.createElement('div');
    backdrop.id        = 'panelBackdrop';
    backdrop.className = 'panel-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.onclick   = closePanels;
    document.body.appendChild(backdrop);

    const favPanel = document.createElement('div');
    favPanel.id = 'favoritesModal';
    favPanel.className = 'side-panel';
    favPanel.setAttribute('role', 'dialog');
    favPanel.setAttribute('aria-modal', 'true');
    favPanel.setAttribute('aria-label', 'Mis Favoritos');
    favPanel.setAttribute('aria-hidden', 'true');
    favPanel.innerHTML = `
        <div class="panel-header">
            <h2>❤️ Mis Favoritos</h2>
            <button class="panel-close-btn" onclick="closePanels()" aria-label="Cerrar panel de favoritos">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="panel-body"></div>`;
    document.body.appendChild(favPanel);

    const ordPanel = document.createElement('div');
    ordPanel.id = 'ordersModal';
    ordPanel.className = 'side-panel';
    ordPanel.setAttribute('role', 'dialog');
    ordPanel.setAttribute('aria-modal', 'true');
    ordPanel.setAttribute('aria-label', 'Mis Pedidos');
    ordPanel.setAttribute('aria-hidden', 'true');
    ordPanel.innerHTML = `
        <div class="panel-header">
            <h2>📋 Mis Pedidos</h2>
            <button class="panel-close-btn" onclick="closePanels()" aria-label="Cerrar panel de pedidos">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="panel-body"></div>`;
    document.body.appendChild(ordPanel);

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanels(); });
}

// SEGUIMIENTO DE ACTIVIDAD DEL USUARIO
function trackUserActivity(type, product) {
    const activity = getUserActivity();

    if (product.category) activity.categories[product.category] = (activity.categories[product.category] || 0) + 1;
    if (product.brand)    activity.brands[product.brand]         = (activity.brands[product.brand]         || 0) + 1;

    const pets = Array.isArray(product.petType) ? product.petType : [product.petType];
    pets.forEach(pet => { if (pet) activity.pets[pet] = (activity.pets[pet] || 0) + 1; });

    if (!activity.seenIds.includes(String(product.id))) {
        activity.seenIds.unshift(String(product.id));
        if (activity.seenIds.length > 30) activity.seenIds.pop();
    }

    activity.hasActivity = true;
    activity.lastUpdated = Date.now();
    saveUserActivity(activity);
    refreshRecommendedIfVisible();
}

function getUserActivity() {
    return _lsGet('userActivity', null) || {
        hasActivity: false, categories: {}, brands: {}, pets: {}, seenIds: [], lastUpdated: null
    };
}

function saveUserActivity(activity) { _lsSet('userActivity', activity); }
function hasUserActivity() { return getUserActivity().hasActivity === true; }

// RECOMENDACIONES PERSONALIZADAS
let _recommendedPool = null;

function filterRealProducts(arr) {
    return arr.filter(p => p.id !== undefined && p.name !== undefined);
}

function _productsChanged(fresh, cached) {
    if (!cached || fresh.length !== cached.length) return true;
    const check = (a, b) => a.id !== b.id || a.stock !== b.stock || a.price !== b.price;
    return check(fresh[0], cached[0]) || check(fresh[fresh.length - 1], cached[cached.length - 1]);
}

function getRecommendedProducts(allProds, max = 10) {
    const activity  = getUserActivity();
    const available = allProds.filter(p => p.stock > 0);

    if (!activity.hasActivity) {
        const onSale = available.filter(p => p.isOnSale).sort(() => Math.random() - 0.5);
        const noSale = available.filter(p => !p.isOnSale).sort(() => Math.random() - 0.5);
        return [...onSale.slice(0, 6), ...noSale.slice(0, 4)].slice(0, max);
    }

    const topCats   = Object.entries(activity.categories).sort((a,b) => b[1]-a[1]).map(e => e[0]);
    const topBrands = Object.entries(activity.brands).sort((a,b) => b[1]-a[1]).map(e => e[0]);
    const topPets   = Object.entries(activity.pets).sort((a,b) => b[1]-a[1]).map(e => e[0]);
    const seenSet   = new Set(activity.seenIds);

    const scored = available
        .filter(p => !seenSet.has(String(p.id)))
        .map(p => {
            let score = 0;
            const catIdx   = topCats.indexOf(p.category);
            const brandIdx = topBrands.indexOf(p.brand);
            const petList  = Array.isArray(p.petType) ? p.petType : [p.petType];
            const petMatch = petList.some(pt => topPets.includes(pt));
            if (catIdx === 0)      score += 5;
            else if (catIdx > 0)   score += 2.5;
            if (brandIdx === 0)    score += 2;
            else if (brandIdx > 0) score += 1;
            if (petMatch)          score += 3;
            if (p.isOnSale)        score += 0.5;
            score += Math.random() * 0.4;
            return { p, score };
        })
        .sort((a, b) => b.score - a.score);

    const MAX_PER_BRAND = 2;
    const brandCount    = {};
    const result        = [];
    const leftover      = [];

    for (const { p } of scored) {
        const brand = p.brand || '__sin_marca__';
        if ((brandCount[brand] || 0) < MAX_PER_BRAND) {
            brandCount[brand] = (brandCount[brand] || 0) + 1;
            result.push(p);
        } else {
            leftover.push(p);
        }
        if (result.length >= max) break;
    }

    if (result.length < max) result.push(...leftover.slice(0, max - result.length));

    if (result.length < max) {
        const resultIds = new Set(result.map(p => String(p.id)));
        const extra = available
            .filter(p => !resultIds.has(String(p.id)) && !seenSet.has(String(p.id)))
            .sort(() => Math.random() - 0.5)
            .slice(0, max - result.length);
        result.push(...extra);
    }

    return result.slice(0, max);
}

function refreshRecommendedIfVisible() {
    const grid = document.getElementById('recommendedGrid');
    if (!grid || !_recommendedPool) return;
    setTimeout(() => { loadRecommendedSection(_recommendedPool); }, 80);
}

function loadRecommendedSection(allProds) {
    if (allProds && allProds.length) _recommendedPool = filterRealProducts(allProds);

    const section  = document.getElementById('recommendedSection');
    const grid     = document.getElementById('recommendedGrid');
    const title    = document.getElementById('recommendedTitle');
    const subtitle = document.getElementById('recommendedSubtitle');
    if (!section || !grid || !_recommendedPool) return;

    const hasAct  = hasUserActivity();
    // Limitar: 2 filas siempre (6 productos en app-mode mobile, variable en web)
    const _w = window.innerWidth;
    const isAppMode = document.body.classList.contains('app-mode');
    const _cols = isAppMode && _w < 768 ? 3 : (_w >= 1280 ? 5 : _w >= 1024 ? 4 : _w >= 768 ? 3 : 2);
    const _maxRows = isAppMode ? 2 : (_cols >= 3 ? 2 : 3);
    const products = getRecommendedProducts(_recommendedPool, _cols * _maxRows);

    if (!products.length) { section.style.display = 'none'; return; }

    if (hasAct) {
        title.textContent    = '✨ Basado en tu actividad reciente';
        subtitle.textContent = 'Productos seleccionados según tus gustos y búsquedas';
    } else {
        title.textContent    = '💡 Productos que te podrían interesar';
        subtitle.textContent = 'Una selección especial para vos y tu mascota';
    }

    const wasVisible = section.style.display !== 'none';
    if (wasVisible) {
        grid.style.opacity    = '0';
        grid.style.transform  = 'translateY(6px)';
        grid.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    }

    grid.innerHTML = products.map(p => createProductCard(p)).join('');
    section.style.display = 'block';

    requestAnimationFrame(() => {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(fitAndObserveProductNames, { timeout: 400 });
        } else {
            setTimeout(fitAndObserveProductNames, 100);
        }
        if (wasVisible) {
            requestAnimationFrame(() => {
                grid.style.opacity   = '1';
                grid.style.transform = 'translateY(0)';
            });
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// LISTENERS PARA APP-MODE (PWA)
// ══════════════════════════════════════════════════════════════════
document.addEventListener('openFavoritesFromApp', function() {
    if (typeof openFavoritesModal === 'function') {
        openFavoritesModal();
    }
});

document.addEventListener('openOrdersFromApp', function() {
    if (typeof openOrdersModal === 'function') {
        openOrdersModal();
    }
});