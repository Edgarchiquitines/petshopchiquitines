// Cart Management
function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
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

function addToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
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

// Price Formatting
function formatPrice(price) {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0,
    }).format(price);
}

// Product Card Creation
function createProductCard(product) {
    const hasDiscount = product.isOnSale && product.originalPrice;
    const discountPercent = hasDiscount
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;
    const imgSrc = product.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400';
    const favActive = isFavorite(product.id);

    return `
        <div class="product-card">
            <div class="product-image" onclick="openImageZoom('${imgSrc.replace(/'/g, "\\'")}', '${product.name.replace(/'/g, "\\'")}')">
                <button class="fav-btn${favActive ? ' fav-btn--active' : ''}" data-id="${product.id}"
                    aria-label="${favActive ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                    onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(product).replace(/"/g,'&quot;')})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${favActive ? '#FF6B35' : 'none'}" stroke="${favActive ? '#FF6B35' : 'currentColor'}" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <img src="${imgSrc}" alt="${product.name}">
                <div class="zoom-hint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </div>
                ${hasDiscount ? `
                    <div class="discount-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                        <span>-${discountPercent}%</span>
                    </div>
                ` : ''}
                ${product.stock === 0 ? `<div class="out-of-stock-overlay">SIN STOCK</div>` : ''}
            </div>
            <div class="product-content">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-meta">
                    <span class="product-weight">${product.weight}</span>
                    <span class="product-pet-type">${product.petType}</span>
                </div>
                <div class="product-price">
                    ${hasDiscount ? `
                        <p class="original-price">${formatPrice(product.originalPrice)}</p>
                        <p class="current-price">${formatPrice(product.price)}</p>
                    ` : `
                        <p class="regular-price">${formatPrice(product.price)}</p>
                    `}
                </div>
                <div class="product-card-actions">
                    <button
                        class="add-to-cart-btn"
                        onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})"
                        ${product.stock === 0 ? 'disabled' : ''}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span>${product.stock === 0 ? 'Sin Stock' : 'Agregar'}</span>
                    </button>
                    <button class="share-wa-btn" onclick="shareProductWA(${JSON.stringify(product).replace(/"/g, '&quot;')})" aria-label="Compartir" title="Compartir por WhatsApp">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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

// ── Compartir producto por WhatsApp ─────────────────────────────────────────
function shareProductWA(product) {
    const price = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(product.price);
    const hasDiscount = product.isOnSale && product.originalPrice;
    const originalPrice = hasDiscount
        ? new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(product.originalPrice)
        : null;
    let msg = `🐾 *${product.name}*\n`;
    if (product.brand) msg += `Marca: ${product.brand}\n`;
    if (product.weight) msg += `Peso: ${product.weight}\n`;
    if (hasDiscount) msg += `~~${originalPrice}~~ → *${price}* 🔥\n`;
    else msg += `Precio: *${price}*\n`;
    msg += `\n¡Encontralo en Petshop Chiquitines! 🏪\n`;
    msg += `📍 Av. Peru y Gines, Asunción\n`;
    msg += `👉 https://edgarchiquitines.github.io/petshopchiquitines/products.html`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ================================================================
// IMAGE ZOOM LIGHTBOX
// ================================================================
function openImageZoom(src, alt) {
    if (document.getElementById('imgZoomOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'imgZoomOverlay';
    const isTouchDevice = ('ontouchstart' in window);
    const hintText = isTouchDevice ? 'Pellizca para hacer zoom' : 'Usa la rueda para hacer zoom';
    overlay.innerHTML = `
        <div class="imgzoom-backdrop"></div>
        <div class="imgzoom-container">
            <img class="imgzoom-img" src="${src}" alt="${alt}" draggable="false">
            <button class="imgzoom-close" aria-label="Cerrar">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="imgzoom-hint">${hintText}</div>
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

    let scale = 1, minScale = 1, maxScale = 5;
    let posX = 0, posY = 0, lastDist = 0;
    let isDragging = false, dragStartX = 0, dragStartY = 0;

    function applyTransform() {
        img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    }
    function clampPos() {
        if (scale <= 1) { posX = 0; posY = 0; return; }
        const rect = img.getBoundingClientRect();
        const parent = img.parentElement.getBoundingClientRect();
        const overX = Math.max(0, (rect.width - parent.width) / 2);
        const overY = Math.max(0, (rect.height - parent.height) / 2);
        posX = Math.min(overX, Math.max(-overX, posX));
        posY = Math.min(overY, Math.max(-overY, posY));
    }
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        } else if (e.touches.length === 1 && scale > 1) {
            isDragging = true;
            dragStartX = e.touches[0].clientX - posX;
            dragStartY = e.touches[0].clientY - posY;
        }
    }, { passive: true });
    img.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            scale = Math.min(maxScale, Math.max(minScale, scale * (dist / lastDist)));
            lastDist = dist;
            clampPos(); applyTransform();
        } else if (e.touches.length === 1 && isDragging) {
            posX = e.touches[0].clientX - dragStartX;
            posY = e.touches[0].clientY - dragStartY;
            clampPos(); applyTransform();
        }
    }, { passive: false });

    // Un solo listener touchend — maneja drag, pinch y doble tap
    let lastTap = 0;
    img.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) isDragging = false;
        if (scale <= 1) { scale = 1; posX = 0; posY = 0; applyTransform(); }
        if (e.changedTouches.length === 1) {
            const now = Date.now();
            if (now - lastTap < 300) {
                scale > 1 ? (scale = 1, posX = 0, posY = 0) : (scale = 2.5);
                applyTransform();
            }
            lastTap = now;
        }
    }, { passive: true });

    overlay.querySelector('.imgzoom-container').addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.min(maxScale, Math.max(minScale, scale - e.deltaY * 0.002));
        clampPos(); applyTransform();
    }, { passive: false });
}

// ── Auto font-size para nombres largos ──────────────────────────────────────
function fitProductNames() {
    const isDesktop = window.innerWidth >= 768;
    const MAX_FONT  = isDesktop ? 17 : 15;
    const MIN_FONT  = 10;
    const MAX_LINES = 2;
    document.querySelectorAll('.product-name').forEach(el => {
        el.style.fontSize = MAX_FONT + 'px';
        const lh = parseFloat(getComputedStyle(el).lineHeight) || MAX_FONT * 1.35;
        const maxHeight = lh * MAX_LINES;
        let size = MAX_FONT;
        while (el.scrollHeight > maxHeight + 1 && size > MIN_FONT) {
            size--;
            el.style.fontSize = size + 'px';
        }
    });
}

function observeProductGrid() {
    const grids = document.querySelectorAll('#productsGrid, #recommendedGrid');
    if (!grids.length) return;
    const observer = new MutationObserver(() => { requestAnimationFrame(() => fitProductNames()); });
    grids.forEach(grid => { observer.observe(grid, { childList: true, subtree: false }); });
}

// ================================================================
// NOTIFICACIÓN SIMPLE AL AGREGAR AL CARRITO
// ================================================================
function showAddedToCartNotification(product) {
    const existing = document.getElementById('atcNotif');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.id = 'atcNotif';
    notif.innerHTML = `
        <div class="atcn-inner">
            <div class="atcn-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400'}" alt="${product.name}" class="atcn-img" onerror="this.src='https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400'">
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

function showNotification(message) {
    const notification = document.createElement('div');
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

// ================================================================
// FAB WHATSAPP — ocultar al abrir paneles, mostrar al cerrar
// ================================================================
function hideFab() {
    const fab = document.querySelector('.whatsapp-fab');
    if (fab) fab.classList.add('whatsapp-fab--hidden');
}
function showFab() {
    const fab = document.querySelector('.whatsapp-fab');
    if (fab) fab.classList.remove('whatsapp-fab--hidden');
}

// ── Mobile Menu Toggle + inicialización ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu    = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() { mobileMenu.classList.toggle('active'); });
        mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.remove('active'));
        });
    }
    updateCartCount();
    injectPanels();
    updateFavCount();
    observeProductGrid();
    window.addEventListener('resize', () => { requestAnimationFrame(() => fitProductNames()); });
});

// CSS animations + estilos inyectados
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(100%); opacity: 0; }
    }

    /* ── Toast carrito ── */
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
    .atcn-check {
        width: 1.5rem; height: 1.5rem; border-radius: 9999px;
        background: #10b981; display: flex; align-items: center;
        justify-content: center; flex-shrink: 0; color: #fff;
    }
    .atcn-img {
        width: 2.25rem; height: 2.25rem; object-fit: cover;
        border-radius: 0.375rem; flex-shrink: 0; background: #333;
    }
    .atcn-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }
    .atcn-label { font-size: 0.7rem; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.04em; }
    .atcn-name { font-size: 0.78rem; font-weight: 500; color: #e5e7eb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .atcn-btn {
        flex-shrink: 0; background: #FF6B35; color: #fff; text-decoration: none;
        font-size: 0.72rem; font-weight: 700; padding: 0.35rem 0.65rem;
        border-radius: 0.5rem; transition: background 0.15s; white-space: nowrap;
    }
    .atcn-btn:hover { background: #E55A2B; }
    @media (max-width: 767px) {
        #atcNotif { top: auto; bottom: 5rem; right: 0.75rem; left: 0.75rem; }
        .atcn-inner { max-width: 100%; }
    }

    /* ── Hint del lightbox ── */
    .imgzoom-hint {
        position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.6); color: #fff; font-size: 0.75rem;
        padding: 0.3rem 0.75rem; border-radius: 9999px;
        pointer-events: none; transition: opacity 0.4s ease; opacity: 1; white-space: nowrap;
    }
    .imgzoom-hint--hidden { opacity: 0; }

    /* ── FAB oculto cuando panel está abierto ── */
    .whatsapp-fab--hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: scale(0.7) !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
    }
`;
document.head.appendChild(style);

// ================================================================
// FAVORITOS (WISHLIST)
// ================================================================
function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
}
function saveFavorites(favs) {
    localStorage.setItem('favorites', JSON.stringify(favs));
    updateFavCount();
}
function toggleFavorite(product) {
    const favs = getFavorites();
    const idx  = favs.findIndex(f => f.id === product.id);
    if (idx >= 0) {
        favs.splice(idx, 1);
        showNotification('Eliminado de favoritos');
    } else {
        favs.push(product);
        showNotification('❤️ Guardado en favoritos');
        trackUserActivity('favorite', product);
    }
    saveFavorites(favs);
    document.querySelectorAll(`.fav-btn[data-id="${product.id}"]`).forEach(btn => refreshFavBtn(btn, product.id));
}
function isFavorite(productId) {
    return getFavorites().some(f => f.id === productId);
}
function refreshFavBtn(btn, productId) {
    const active = isFavorite(productId);
    btn.classList.toggle('fav-btn--active', active);
    btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
    btn.querySelector('svg').setAttribute('fill', active ? '#FF6B35' : 'none');
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <p>No tenés productos guardados</p>
                <a href="products.html">Ver productos</a>
            </div>`;
    } else {
        body.innerHTML = favs.map(p => {
            const img = p.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400';
            return `
            <div class="panel-product-row" id="fav-row-${p.id}">
                <img src="${img}" alt="${p.name}" class="panel-product-img">
                <div class="panel-product-info">
                    <span class="panel-product-name">${p.name}</span>
                    <span class="panel-product-brand">${p.brand || ''}</span>
                    <span class="panel-product-price">${formatPrice(p.price)}</span>
                </div>
                <div class="panel-product-actions">
                    <button class="panel-add-btn" onclick="addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')})" title="Agregar al carrito">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </button>
                    <button class="panel-remove-btn" onclick="removeFavFromPanel(${p.id})" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }
    modal.classList.add('panel--open');
    document.getElementById('panelBackdrop')?.classList.add('panel--open');
    hideFab(); // ← ocultar FAB al abrir favoritos
}

function removeFavFromPanel(productId) {
    const favs = getFavorites().filter(f => f.id !== productId);
    saveFavorites(favs);
    const row = document.getElementById('fav-row-' + productId);
    if (row) { row.style.opacity = '0'; setTimeout(() => { row.remove(); checkFavPanelEmpty(); }, 200); }
    document.querySelectorAll(`.fav-btn[data-id="${productId}"]`).forEach(btn => refreshFavBtn(btn, productId));
}

function checkFavPanelEmpty() {
    const body = document.querySelector('#favoritesModal .panel-body');
    if (body && !body.querySelector('.panel-product-row')) {
        body.innerHTML = `
            <div class="panel-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <p>No tenés productos guardados</p>
                <a href="products.html">Ver productos</a>
            </div>`;
    }
}

// ================================================================
// HISTORIAL DE PEDIDOS
// ================================================================
function saveOrder(orderData) {
    const orders = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    orders.unshift(orderData);
    if (orders.length > 20) orders.splice(20);
    localStorage.setItem('orderHistory', JSON.stringify(orders));
    if (orderData.items) {
        orderData.items.forEach(item => trackUserActivity('order', item));
    }
}
function getOrders() {
    return JSON.parse(localStorage.getItem('orderHistory') || '[]');
}

function openOrdersModal() {
    closePanels();
    const orders = getOrders();
    const modal  = document.getElementById('ordersModal');
    if (!modal) return;
    const body = modal.querySelector('.panel-body');
    if (!orders.length) {
        body.innerHTML = `
            <div class="panel-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path><rect x="9" y="3" width="6" height="4" rx="1" ry="1"></rect></svg>
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
                    <span>${o.deliveryMethod === 'delivery' ? '🚚 Delivery' : '🏠 Retiro'}</span>
                    <span>${o.paymentMethod === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia'}</span>
                </div>
                <ul class="order-history-items">
                    ${o.items.map(it => `
                        <li>
                            <span class="order-item-name">${it.name}</span>
                            <span class="order-item-qty">x${it.quantity}</span>
                            <span class="order-item-price">${formatPrice(it.price * it.quantity)}</span>
                        </li>`).join('')}
                </ul>
                <div class="order-history-footer">
                    <button class="order-repeat-btn" onclick="reOrderToCart(${i})">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 .49-4.95"></path>
                        </svg>
                        Repetir pedido
                    </button>
                </div>
            </div>`).join('');
    }
    modal.classList.add('panel--open');
    document.getElementById('panelBackdrop')?.classList.add('panel--open');
    hideFab(); // ← ocultar FAB al abrir historial de pedidos
}

async function reOrderToCart(orderIndex) {
    const orders = getOrders();
    const order  = orders[orderIndex];
    if (!order) return;
    let freshProducts = null;
    if (typeof allProducts !== 'undefined' && allProducts.length) freshProducts = allProducts;
    if (!freshProducts) {
        try { const cached = localStorage.getItem('productsCache'); if (cached) freshProducts = JSON.parse(cached); } catch(e) {}
    }
    if (!freshProducts) {
        try {
            const results = await Promise.all([fetch('products1.json').then(r => r.json()), fetch('products2.json').then(r => r.json())]);
            freshProducts = results.flat();
            try { localStorage.setItem('productsCache', JSON.stringify(freshProducts)); } catch(e) {}
        } catch(e) { freshProducts = null; }
    }
    const newCart = order.items.map(it => {
        if (freshProducts) {
            const fresh = freshProducts.find(p => String(p.id) === String(it.id));
            if (fresh) return { ...fresh, quantity: it.quantity };
        }
        return { ...it };
    });
    localStorage.setItem('cart', JSON.stringify(newCart));
    updateCartCount();
    closePanels();
    showNotification('🛒 Pedido cargado en el carrito');
    setTimeout(() => { window.location.href = 'cart.html'; }, 900);
}

// ── Cerrar paneles y restaurar FAB ───────────────────────────────
function closePanels() {
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('panel--open'));
    document.getElementById('panelBackdrop')?.classList.remove('panel--open');
    showFab(); // ← restaurar FAB al cerrar cualquier panel
}

// ── Inyectar paneles + backdrop ──────────────────────────────────
function injectPanels() {
    if (document.getElementById('favoritesModal')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'panelBackdrop';
    backdrop.className = 'panel-backdrop';
    backdrop.onclick = closePanels;
    document.body.appendChild(backdrop);

    const favPanel = document.createElement('div');
    favPanel.id = 'favoritesModal';
    favPanel.className = 'side-panel';
    favPanel.innerHTML = `
        <div class="panel-header">
            <h2>❤️ Mis Favoritos</h2>
            <button class="panel-close-btn" onclick="closePanels()" aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="panel-body"></div>`;
    document.body.appendChild(favPanel);

    const ordPanel = document.createElement('div');
    ordPanel.id = 'ordersModal';
    ordPanel.className = 'side-panel';
    ordPanel.innerHTML = `
        <div class="panel-header">
            <h2>📋 Mis Pedidos</h2>
            <button class="panel-close-btn" onclick="closePanels()" aria-label="Cerrar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="panel-body"></div>`;
    document.body.appendChild(ordPanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanels(); });
}

// ================================================================
// SEGUIMIENTO DE ACTIVIDAD DEL USUARIO
// ================================================================
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
    try {
        return JSON.parse(localStorage.getItem('userActivity') || 'null') || { hasActivity: false, categories: {}, brands: {}, pets: {}, seenIds: [], lastUpdated: null };
    } catch(e) {
        return { hasActivity: false, categories: {}, brands: {}, pets: {}, seenIds: [], lastUpdated: null };
    }
}
function saveUserActivity(activity) { try { localStorage.setItem('userActivity', JSON.stringify(activity)); } catch(e) {} }
function hasUserActivity() { return getUserActivity().hasActivity === true; }

// ================================================================
// RECOMENDACIONES PERSONALIZADAS
// ================================================================
let _recommendedPool = null;
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
            if (catIdx === 0) score += 5; else if (catIdx > 0) score += 2.5;
            if (brandIdx === 0) score += 2; else if (brandIdx > 0) score += 1;
            if (petList.some(pt => topPets.includes(pt))) score += 3;
            if (p.isOnSale) score += 0.5;
            score += Math.random() * 0.4;
            return { p, score };
        })
        .sort((a, b) => b.score - a.score);
    const MAX_PER_BRAND = 2, brandCount = {}, result = [], leftover = [];
    for (const { p } of scored) {
        const brand = p.brand || '__sin_marca__';
        if ((brandCount[brand] || 0) < MAX_PER_BRAND) { brandCount[brand] = (brandCount[brand] || 0) + 1; result.push(p); }
        else leftover.push(p);
        if (result.length >= max) break;
    }
    if (result.length < max) result.push(...leftover.slice(0, max - result.length));
    if (result.length < max) {
        const resultIds = new Set(result.map(p => String(p.id)));
        result.push(...available.filter(p => !resultIds.has(String(p.id)) && !seenSet.has(String(p.id))).sort(() => Math.random() - 0.5).slice(0, max - result.length));
    }
    return result.slice(0, max);
}
function refreshRecommendedIfVisible() {
    const grid = document.getElementById('recommendedGrid');
    if (!grid || !_recommendedPool) return;
    setTimeout(() => { loadRecommendedSection(_recommendedPool); }, 80);
}
function loadRecommendedSection(allProds) {
    if (allProds && allProds.length) _recommendedPool = allProds;
    const section  = document.getElementById('recommendedSection');
    const grid     = document.getElementById('recommendedGrid');
    const title    = document.getElementById('recommendedTitle');
    const subtitle = document.getElementById('recommendedSubtitle');
    if (!section || !grid || !_recommendedPool) return;
    const hasActivity = hasUserActivity();
    const products    = getRecommendedProducts(_recommendedPool, 10);
    if (!products.length) { section.style.display = 'none'; return; }
    if (hasActivity) {
        title.textContent    = '✨ Basado en tu actividad reciente';
        subtitle.textContent = 'Productos seleccionados según tus gustos y búsquedas';
    } else {
        title.textContent    = '💡 Productos que te podrían interesar';
        subtitle.textContent = 'Una selección especial para vos y tu mascota';
    }
    const wasVisible = section.style.display !== 'none';
    if (wasVisible) {
        grid.style.opacity = '0';
        grid.style.transform = 'translateY(6px)';
        grid.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    }
    grid.innerHTML = products.map(p => createProductCard(p)).join('');
    section.style.display = 'block';
    requestAnimationFrame(() => {
        fitProductNames();
        if (wasVisible) { requestAnimationFrame(() => { grid.style.opacity = '1'; grid.style.transform = 'translateY(0)'; }); }
    });
}
