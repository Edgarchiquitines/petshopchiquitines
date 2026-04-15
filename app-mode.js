/**
 * App Mode Controller - Pet Shop Chiquitines
 * Maneja navegación, gestos y comportamientos específicos de PWA instalada
 */

'use strict';

const AppMode = (() => {
    const state = {
        isAppMode: false,
        currentPage: 'home',
        pages: ['home', 'products', 'cart', 'favorites'],
        lastScrollPositions: {},
        touchStartX: 0,
        touchStartY: 0,
    };

    /**
     * Detectar si está en modo app (display: standalone)
     */
    function detectAppMode() {
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true ||
            document.referrer.includes('android-app://');

        state.isAppMode = isStandalone;
        
        if (state.isAppMode) {
            document.body.classList.add('app-mode');
            init();
        }
    }

    /**
     * Inicializar app mode
     */
    function init() {
        setupDOM();
        setupBottomNav();
        setupEventListeners();
        setupPageTransitions();
        preventPullToRefresh();
        optimizeViewport();
    }

    /**
     * Optimizar estructura del DOM para app mode
     */
    function setupDOM() {
        // Crear contenedor de páginas si no existe
        const mainContent = document.querySelector('main') || document.body;
        
        // Mover hero a página de inicio
        const hero = document.querySelector('.hero');
        if (hero && !document.getElementById('app-pages-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'app-pages-wrapper';
            wrapper.id = 'app-pages-wrapper';

            // Crear página home
            const homePage = document.createElement('div');
            homePage.className = 'app-page active';
            homePage.id = 'page-home';
            homePage.innerHTML = `
                ${hero.outerHTML}
                <div id="homeProductsSection" class="products-section">
                    <div class="container">
                        <div class="section-header">
                            <h2>Ofertas</h2>
                        </div>
                        <div id="productsGrid" class="products-grid" aria-busy="true"></div>
                        <div style="padding: 0 0.75rem;">
                            <button id="seeAllOffersBtn" style="display:none;width:100%;padding:0.75rem;margin-top:0.75rem;background:#FF6B35;color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-weight:600;">
                                Ver todas las ofertas
                            </button>
                        </div>
                    </div>
                </div>
            `;

            wrapper.appendChild(homePage);

            // Insertar antes del footer
            const footer = document.querySelector('.footer');
            if (footer) {
                footer.parentNode.insertBefore(wrapper, footer);
            } else {
                document.body.appendChild(wrapper);
            }

            // Ocultar hero original
            hero.style.display = 'none';
        }

        // Ocultar footer
        const footer = document.querySelector('.footer');
        if (footer) footer.style.display = 'none';
    }

    /**
     * Crear y configurar bottom navigation bar
     */
    function setupBottomNav() {
        // Si ya existe, no crear de nuevo
        if (document.querySelector('.bottom-nav')) return;

        const bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        bottomNav.innerHTML = `
            <a href="#" class="bottom-nav-item active" data-page="home" aria-label="Inicio">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Inicio</span>
            </a>
            <a href="#" class="bottom-nav-item" data-page="products" aria-label="Productos">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>Productos</span>
            </a>
            <a href="#" class="bottom-nav-item" data-page="favorites" aria-label="Favoritos">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:relative;">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span class="bottom-nav-badge" id="favBadge" style="display:none">0</span>
                <span>Favoritos</span>
            </a>
            <a href="#" class="bottom-nav-item" data-page="cart" aria-label="Carrito">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:relative;">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span class="bottom-nav-badge" id="cartBadge" style="display:none">0</span>
                <span>Carrito</span>
            </a>
        `;

        document.body.appendChild(bottomNav);

        // Event listeners para navegación
        bottomNav.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                navigateToPage(page);
                updateBottomNav(page);
            });
        });

        updateBadges();
    }

    /**
     * Navegar entre páginas
     */
    function navigateToPage(pageId) {
        // Guardar scroll position de página anterior
        const pagesWrapper = document.querySelector('.app-pages-wrapper');
        if (pagesWrapper && state.currentPage) {
            state.lastScrollPositions[state.currentPage] = pagesWrapper.scrollTop;
        }

        state.currentPage = pageId;

        // Si es una página interna (productos, carrito), cargar HTML
        if (pageId === 'products') {
            loadProductsPage();
        } else if (pageId === 'cart') {
            loadCartPage();
        } else if (pageId === 'favorites') {
            loadFavoritesPage();
        } else {
            // Mostrar página home
            showPage('home');
        }

        // Restaurar scroll position después de que el DOM se actualice
        requestAnimationFrame(() => {
            if (pagesWrapper) {
                pagesWrapper.scrollTop = state.lastScrollPositions[pageId] || 0;
            }
        });
    }

    /**
     * Mostrar una página específica
     */
    function showPage(pageId) {
        const pages = document.querySelectorAll('.app-page');
        pages.forEach(page => page.classList.remove('active'));
        
        const targetPage = document.getElementById(`page-${pageId}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    /**
     * Cargar página de productos
     */
    function loadProductsPage() {
        let productsPage = document.getElementById('page-products');
        
        if (!productsPage) {
            productsPage = document.createElement('div');
            productsPage.className = 'app-page';
            productsPage.id = 'page-products';
            productsPage.innerHTML = `
                <div class="products-section" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                    <div class="container">
                        <div class="section-header">
                            <h2>Catálogo Completo</h2>
                        </div>
                        <div id="allProductsGrid" class="products-grid" aria-busy="true"></div>
                    </div>
                </div>
            `;
            
            const wrapper = document.getElementById('app-pages-wrapper');
            if (wrapper) {
                wrapper.appendChild(productsPage);
            }

            // Cargar datos de productos
            loadAllProducts();
        }

        showPage('products');
    }

    /**
     * Cargar página del carrito
     */
    function loadCartPage() {
        let cartPage = document.getElementById('page-cart');
        
        if (!cartPage) {
            cartPage = document.createElement('div');
            cartPage.className = 'app-page';
            cartPage.id = 'page-cart';
            cartPage.innerHTML = `
                <div class="cart-app-container" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 1rem 0.75rem;">
                    <div class="section-header">
                        <h2>Carrito</h2>
                    </div>
                    <div id="appCartItems"></div>
                </div>
            `;
            
            const wrapper = document.getElementById('app-pages-wrapper');
            if (wrapper) {
                wrapper.appendChild(cartPage);
            }
        }

        showPage('cart');
        renderCartItems();
    }

    /**
     * Cargar página de favoritos
     */
    function loadFavoritesPage() {
        let favsPage = document.getElementById('page-favorites');
        
        if (!favsPage) {
            favsPage = document.createElement('div');
            favsPage.className = 'app-page';
            favsPage.id = 'page-favorites';
            favsPage.innerHTML = `
                <div class="products-section" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;">
                    <div class="container">
                        <div class="section-header">
                            <h2>Mis Favoritos</h2>
                        </div>
                        <div id="favoritesGrid" class="products-grid" aria-busy="true"></div>
                    </div>
                </div>
            `;
            
            const wrapper = document.getElementById('app-pages-wrapper');
            if (wrapper) {
                wrapper.appendChild(favsPage);
            }
        }

        showPage('favorites');
        renderFavorites();
    }

    /**
     * Actualizar estado del bottom nav
     */
    function updateBottomNav(pageId) {
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Actualizar badges del carrito y favoritos
     */
    function updateBadges() {
        // Carrito
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartBadge = document.getElementById('cartBadge');
        if (cart.length > 0) {
            cartBadge.textContent = cart.length;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }

        // Favoritos
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        const favBadge = document.getElementById('favBadge');
        if (favs.length > 0) {
            favBadge.textContent = favs.length;
            favBadge.style.display = 'flex';
        } else {
            favBadge.style.display = 'none';
        }
    }

    /**
     * Configurar event listeners
     */
    function setupEventListeners() {
        // Actualizar badges cuando cambia el carrito
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart' || e.key === 'favorites') {
                updateBadges();
            }
        });

        // Detectar cambios en localStorage (misma pestaña)
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'cart' || key === 'favorites') {
                updateBadges();
            }
        };

        // Touch eventos para gestos
        document.addEventListener('touchstart', handleTouchStart, false);
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, false);

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                updateBadges();
            }
        });
    }

    /**
     * Transiciones entre páginas
     */
    function setupPageTransitions() {
        const pagesWrapper = document.querySelector('.app-pages-wrapper');
        if (pagesWrapper) {
            // Smooth scroll
            pagesWrapper.addEventListener('scroll', debounce(() => {
                // Lazy load images, analytics, etc
            }, 200), { passive: true });
        }
    }

    /**
     * Prevenir pull-to-refresh en Android
     */
    function preventPullToRefresh() {
        // Solo prevenir en el wrapper de páginas, no en todo el documento
        // Esto evita congelar el scroll en toda la app
        const getWrapper = () => document.querySelector('.app-pages-wrapper');

        document.addEventListener('touchstart', (e) => {
            const wrapper = getWrapper();
            if (wrapper) {
                wrapper._ptrStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const wrapper = getWrapper();
            if (!wrapper) return;

            const currentY = e.touches[0].clientY;
            const startY  = wrapper._ptrStartY || currentY;

            // Solo prevenir si estamos al tope Y jalando hacia abajo
            if (wrapper.scrollTop <= 0 && currentY > startY) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Optimizar viewport
     */
    function optimizeViewport() {
        // El viewport ya está configurado correctamente en el meta tag del HTML.
        // No modificar en runtime — puede causar flickers en iOS.
        // Forzar height correcto en html/body para que el flex layout funcione.
        document.documentElement.style.height = '100%';
        document.body.style.height = '100dvh';
    }

    /**
     * Handlers de touch gestures
     */
    function handleTouchStart(e) {
        state.touchStartX = e.touches[0].clientX;
        state.touchStartY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
        // Aquí se pueden agregar gestos adicionales
    }

    function handleTouchEnd(e) {
        // Aquí se pueden detectar swipes
    }

    /**
     * Cargar todos los productos
     */
    async function loadAllProducts() {
        const grid = document.getElementById('allProductsGrid');
        if (!grid) return;

        try {
            const response = await fetch('products.json');
            const products = await response.json();
            grid.innerHTML = products
                .filter(p => p.stock > 0)
                .map(p => createProductCardHTML(p))
                .join('');
        } catch (error) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No se pudieron cargar los productos</p>';
        }
    }

    /**
     * Renderizar carrito
     */
    function renderCartItems() {
        const container = document.getElementById('appCartItems');
        if (!container) return;

        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem 1rem; color: #999;"><p>Carrito vacío</p><a href="#" onclick="AppMode.navigate(\'products\'); return false;" style="color: #FF6B35; text-decoration: none;">Ver productos</a></div>';
            return;
        }

        container.innerHTML = cart.map(item => `
            <div style="background: #f9fafb; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.75rem; border: 1px solid #e5e7eb;">
                <div style="display: flex; gap: 0.75rem;">
                    <img src="${item.image}" alt="${item.name}" style="width: 3.5rem; height: 3.5rem; object-fit: cover; border-radius: 0.375rem; background: #e5e7eb;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 0.85rem;">${item.name}</div>
                        <div style="font-size: 0.75rem; color: #999; margin: 0.25rem 0;">${item.brand}</div>
                        <div style="color: #FF6B35; font-weight: 700; font-size: 0.9rem;">₲ ${item.price.toLocaleString()}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <button style="width: 1.75rem; height: 1.75rem; border-radius: 0.25rem; background: #FF6B35; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                        <span style="text-align: center; font-size: 0.75rem;">${item.quantity}</span>
                        <button style="width: 1.75rem; height: 1.75rem; border-radius: 0.25rem; background: #fee2e2; color: #ef4444; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderizar favoritos
     */
    async function renderFavorites() {
        const grid = document.getElementById('favoritesGrid');
        if (!grid) return;

        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        
        if (favs.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem 1rem; color: #999;"><p>No tienes favoritos</p></div>';
            return;
        }

        try {
            const response = await fetch('products.json');
            const products = await response.json();
            const favProducts = products.filter(p => favs.includes(p.id));
            grid.innerHTML = favProducts.map(p => createProductCardHTML(p)).join('');
        } catch (error) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Error al cargar favoritos</p>';
        }
    }

    /**
     * Crear HTML de tarjeta de producto
     */
    function createProductCardHTML(product) {
        return `
            <div style="background: #fff; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
                <div style="aspect-ratio: 1; overflow: hidden; background: #f3f4f6; position: relative;">
                    <img src="${product.imageUrl || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    ${product.isOnSale ? '<span style="position: absolute; top: 0.5rem; right: 0.5rem; background: #FF6B35; color: #fff; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.65rem; font-weight: 700;">-25%</span>' : ''}
                </div>
                <div style="padding: 0.5rem;">
                    <div style="font-weight: 600; font-size: 0.8rem; line-height: 1.3; margin-bottom: 0.25rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${product.name}</div>
                    <div style="font-size: 0.7rem; color: #999; margin-bottom: 0.35rem;">${product.brand}</div>
                    <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="color: #FF6B35; font-weight: 700; font-size: 0.9rem;">₲ ${product.price.toLocaleString()}</span>
                        ${product.originalPrice ? `<span style="color: #999; font-size: 0.65rem; text-decoration: line-through;">₲ ${product.originalPrice.toLocaleString()}</span>` : ''}
                    </div>
                    <button style="width: 100%; padding: 0.55rem; background: #FF6B35; color: #fff; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 0.8rem;">Agregar</button>
                </div>
            </div>
        `;
    }

    /**
     * Utilidad: debounce
     */
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    /**
     * API pública
     */
    return {
        init: detectAppMode,
        navigate: (page) => navigateToPage(page),
        updateBadges: updateBadges,
        isAppMode: () => state.isAppMode,
    };
})();

// Inicializar cuando el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppMode.init());
} else {
    AppMode.init();
}