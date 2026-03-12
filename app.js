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
    showNotification('Producto agregado al carrito');
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

        if (newQuantity < 1 || newQuantity > item.stock) {
            return false;
        }

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
                ${product.stock === 0 ? `
                    <div class="out-of-stock-overlay">SIN STOCK</div>
                ` : ''}
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
            </div>
        </div>
    `;
}

// ================================================================
// IMAGE ZOOM LIGHTBOX
// Funciona con pinch-to-zoom nativo en mobile y rueda en desktop.
// ================================================================
function openImageZoom(src, alt) {
    // Evitar duplicados
    if (document.getElementById('imgZoomOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'imgZoomOverlay';
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
            <div class="imgzoom-hint">Pellizca para hacer zoom</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Pequeña animación de entrada
    requestAnimationFrame(() => overlay.classList.add('imgzoom--open'));

    const img       = overlay.querySelector('.imgzoom-img');
    const closeBtn  = overlay.querySelector('.imgzoom-close');
    const hint      = overlay.querySelector('.imgzoom-hint');

    // Ocultar hint luego de 2 s
    setTimeout(() => hint.classList.add('imgzoom-hint--hidden'), 2000);

    // Cerrar
    function closeZoom() {
        overlay.classList.remove('imgzoom--open');
        overlay.classList.add('imgzoom--closing');
        setTimeout(() => overlay.remove(), 250);
    }

    closeBtn.addEventListener('click', closeZoom);
    overlay.querySelector('.imgzoom-backdrop').addEventListener('click', closeZoom);

    // Cerrar con tecla Escape
    function onKeyDown(e) {
        if (e.key === 'Escape') { closeZoom(); document.removeEventListener('keydown', onKeyDown); }
    }
    document.addEventListener('keydown', onKeyDown);

    // ── Pinch-to-zoom + drag para mobile ────────────────────────────────
    let scale     = 1;
    let minScale  = 1;
    let maxScale  = 5;
    let posX      = 0;
    let posY      = 0;
    let lastDist  = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastPosX   = 0;
    let lastPosY   = 0;

    function applyTransform() {
        img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    }

    function clampPos() {
        if (scale <= 1) { posX = 0; posY = 0; return; }
        const rect    = img.getBoundingClientRect();
        const parent  = img.parentElement.getBoundingClientRect();
        const overX   = Math.max(0, (rect.width  - parent.width)  / 2);
        const overY   = Math.max(0, (rect.height - parent.height) / 2);
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
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist / lastDist;
            scale = Math.min(maxScale, Math.max(minScale, scale * delta));
            lastDist = dist;
            clampPos();
            applyTransform();
        } else if (e.touches.length === 1 && isDragging) {
            posX = e.touches[0].clientX - dragStartX;
            posY = e.touches[0].clientY - dragStartY;
            clampPos();
            applyTransform();
        }
    }, { passive: false });

    img.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) isDragging = false;
        // Si volvió a escala 1 o menos, resetear posición
        if (scale <= 1) { scale = 1; posX = 0; posY = 0; applyTransform(); }
    }, { passive: true });

    // Doble tap para zoom x2 / reset
    let lastTap = 0;
    img.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            if (scale > 1) { scale = 1; posX = 0; posY = 0; }
            else           { scale = 2.5; }
            applyTransform();
        }
        lastTap = now;
    }, { passive: true });

    // ── Scroll con rueda del mouse en desktop ────────────────────────────
    overlay.querySelector('.imgzoom-container').addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.min(maxScale, Math.max(minScale, scale - e.deltaY * 0.002));
        clampPos();
        applyTransform();
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
    const grids = document.querySelectorAll('#productsGrid');
    if (!grids.length) return;

    const observer = new MutationObserver(() => {
        requestAnimationFrame(() => fitProductNames());
    });

    grids.forEach(grid => {
        observer.observe(grid, { childList: true, subtree: false });
    });
}
// ────────────────────────────────────────────────────────────────────────────

// Notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 5rem;
        right: 1rem;
        background-color: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ── Mobile Menu Toggle + inicialización ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu    = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
        mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.remove('active'));
        });
    }

    updateCartCount();
    injectPanels();
    updateFavCount();

    // Iniciar observer para ajuste automático de nombres
    observeProductGrid();

    window.addEventListener('resize', () => {
        requestAnimationFrame(() => fitProductNames());
    });
});
// ────────────────────────────────────────────────────────────────────────────

// CSS animations
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
    }
    saveFavorites(favs);
    // Actualizar todos los botones de corazón visibles para este producto
    document.querySelectorAll(`.fav-btn[data-id="${product.id}"]`).forEach(btn => {
        refreshFavBtn(btn, product.id);
    });
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
    const favs = getFavorites();
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
    orders.unshift(orderData); // más reciente primero
    if (orders.length > 20) orders.splice(20); // máximo 20 pedidos
    localStorage.setItem('orderHistory', JSON.stringify(orders));
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
}

async function reOrderToCart(orderIndex) {
    const orders = getOrders();
    const order  = orders[orderIndex];
    if (!order) return;

    // Fuente 1: allProducts en memoria (si estamos en products.html)
    let freshProducts = null;
    if (typeof allProducts !== 'undefined' && allProducts.length) {
        freshProducts = allProducts;
    }

    // Fuente 2: caché en localStorage
    if (!freshProducts) {
        try {
            const cached = localStorage.getItem('productsCache');
            if (cached) freshProducts = JSON.parse(cached);
        } catch(e) {}
    }

    // Fuente 3: cargar los JSON directamente (siempre funciona)
    if (!freshProducts) {
        try {
            const results = await Promise.all([
                fetch('products1.json').then(r => r.json()),
                fetch('products2.json').then(r => r.json())
            ]);
            freshProducts = results.flat();
            // Guardar para la próxima vez
            try { localStorage.setItem('productsCache', JSON.stringify(freshProducts)); } catch(e) {}
        } catch(e) {
            freshProducts = null;
        }
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

// ── Cerrar todos los paneles ──────────────────────────────────────
function closePanels() {
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('panel--open'));
    document.getElementById('panelBackdrop')?.classList.remove('panel--open');
}

// ── Inyectar paneles + backdrop en el DOM una sola vez ───────────
function injectPanels() {
    if (document.getElementById('favoritesModal')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'panelBackdrop';
    backdrop.className = 'panel-backdrop';
    backdrop.onclick = closePanels;
    document.body.appendChild(backdrop);

    // Panel Favoritos
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

    // Panel Historial
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

    // Cerrar con Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanels(); });
}
