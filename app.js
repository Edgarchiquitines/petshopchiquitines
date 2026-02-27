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
    const updatedCart = cart.filter(item => item.id !== productId);
    saveCart(updatedCart);
}

function updateQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    
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

    return `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400'}" 
                     alt="${product.name}">
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

// ── Auto font-size para nombres largos ──────────────────────────────────────
// Se llama después de renderizar las tarjetas.
// Reduce el font-size de .product-name hasta que el texto entre en 2 líneas.
function fitProductNames() {
    const MAX_FONT  = 13; // px — tamaño máximo (equivale a ~0.8rem en mobile)
    const MIN_FONT  = 9;  // px — nunca baja de acá
    const MAX_LINES = 2;  // altura objetivo: 2 líneas

    document.querySelectorAll('.product-name').forEach(el => {
        // Resetear por si se llama más de una vez
        el.style.fontSize = MAX_FONT + 'px';

        // lineHeight real en px
        const lh = parseFloat(getComputedStyle(el).lineHeight) || MAX_FONT * 1.35;
        const maxHeight = lh * MAX_LINES;

        let size = MAX_FONT;
        while (el.scrollHeight > maxHeight + 1 && size > MIN_FONT) {
            size--;
            el.style.fontSize = size + 'px';
        }
    });
}

// Llama a fitProductNames cada vez que se renderizan tarjetas.
// Usamos un MutationObserver para detectar cuando el grid cambia.
function observeProductGrid() {
    const grids = document.querySelectorAll('#productsGrid');
    if (!grids.length) return;

    const observer = new MutationObserver(() => {
        // Pequeño delay para que el navegador pinte el DOM antes de medir
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

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
    }

    updateCartCount();

    // Iniciar observer para ajuste de nombres
    observeProductGrid();

    // También ajustar al redimensionar la ventana
    window.addEventListener('resize', () => {
        requestAnimationFrame(() => fitProductNames());
    });
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
