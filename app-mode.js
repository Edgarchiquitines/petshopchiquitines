/**
 * App Mode Controller - Pet Shop Chiquitines
 * Detecta modo standalone (PWA instalada) y activa el layout nativo.
 * - Agrega clase .app-mode al body
 * - Envuelve contenido en #app-scroll-content
 * - Inyecta bottom navigation bar persistente
 * - Maneja badges de carrito y favoritos
 * - El favorito abre el modal directamente (sin recargar página)
 * - Oculta la navegación del header (hamburguesa + nav desktop)
 */

'use strict';

(function () {

    function isAppMode() {
        // Solo activar app-mode si es PWA Y es un dispositivo móvil real
        const isStandalone = (
            window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true ||
            document.referrer.includes('android-app://')
        );
        
        // Detectar si es un dispositivo móvil real
        const isMobileDevice = (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            ('ontouchstart' in window && window.innerWidth < 1024)
        );
        
        // Solo activar app-mode en PWA instalada en móviles
        return isStandalone && isMobileDevice;
    }

    function init() {
        if (!isAppMode()) return;

        document.body.classList.add('app-mode');

        wrapContentForScroll();
        injectBottomNav();
        updateBadges();
        hookBadgeUpdates();
        preventPullToRefresh();
        markActiveNavItem();
        injectCartWhatsAppButton();
    }

    /**
     * Envuelve el contenido principal entre header y footer
     * en un div scrolleable.
     */
    function wrapContentForScroll() {
        if (document.getElementById('app-scroll-content')) return;

        const header = document.querySelector('.header');
        if (!header) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'app-scroll-content';

        const nodesToWrap = [];
        let node = header.nextSibling;
        while (node) {
            const next = node.nextSibling;
            const isScript = node.nodeType === 1 && node.tagName === 'SCRIPT';
            const isFab    = node.nodeType === 1 && node.classList && node.classList.contains('whatsapp-fab');
            const isText   = node.nodeType === 3;

            if (!isScript && !isFab && !isText) {
                nodesToWrap.push(node);
            }
            node = next;
        }

        nodesToWrap.forEach(n => wrapper.appendChild(n));
        header.insertAdjacentElement('afterend', wrapper);
    }

    function getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('products')) return 'products';
        if (path.includes('cart'))     return 'cart';
        return 'index';
    }

    function injectBottomNav() {
        if (document.querySelector('.bottom-nav')) return;

        const cur = getCurrentPage();

        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('aria-label', 'Navegación principal');
        nav.innerHTML = `
            <a href="index.html" class="bottom-nav-item ${cur === 'index' ? 'active' : ''}" aria-label="Inicio">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Inicio</span>
            </a>
            <a href="products.html" class="bottom-nav-item ${cur === 'products' ? 'active' : ''}" aria-label="Productos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span>Productos</span>
            </a>
            <a href="#" class="bottom-nav-item" id="bnFavBtn" aria-label="Favoritos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span class="bn-badge" id="favBadge"></span>
                <span>Favoritos</span>
            </a>
            <a href="#" class="bottom-nav-item" id="bnOrdersBtn" aria-label="Mis Pedidos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1" ry="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/>
                    <line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
                <span>Pedidos</span>
            </a>
            <a href="cart.html" class="bottom-nav-item ${cur === 'cart' ? 'active' : ''}" aria-label="Carrito">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <span class="bn-badge" id="cartBadge"></span>
                <span>Carrito</span>
            </a>
        `;

        document.body.appendChild(nav);

        // Favoritos: delegar el evento al documento para asegurar que siempre funcione
        const favBtn = nav.querySelector('#bnFavBtn');
        if (favBtn) {
            favBtn.addEventListener('click', function (e) {
                e.preventDefault();
                // Disparar evento personalizado que app.js escuchará
                document.dispatchEvent(new CustomEvent('openFavoritesFromApp'));
            });
        }

        // Pedidos: abre el panel de historial de pedidos
        const ordersBtn = nav.querySelector('#bnOrdersBtn');
        if (ordersBtn) {
            ordersBtn.addEventListener('click', function (e) {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('openOrdersFromApp'));
            });
        }

        // Si venimos de otra página con el flag, abrir favoritos
        if (sessionStorage.getItem('openFavOnLoad') === '1') {
            sessionStorage.removeItem('openFavOnLoad');
            // Esperar a que app.js inicialice los modales
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(function () {
                    if (typeof openFavoritesModal === 'function') openFavoritesModal();
                }, 300);
            });
        }
    }

    /**
     * Marca el item activo según la página actual.
     * Se ejecuta también después de que el DOM esté listo.
     */
    function markActiveNavItem() {
        const cur = getCurrentPage();
        document.querySelectorAll('.bottom-nav-item').forEach(function (item) {
            item.classList.remove('active');
            const href = item.getAttribute('href') || '';
            if (cur === 'index'    && href.includes('index'))    item.classList.add('active');
            if (cur === 'products' && href.includes('products')) item.classList.add('active');
            if (cur === 'cart'     && href.includes('cart'))     item.classList.add('active');
        });
    }

    function updateBadges() {
        // Carrito
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const cartBadge = document.getElementById('cartBadge');
            if (cartBadge) {
                const count = Array.isArray(cart) ? cart.reduce((s, i) => s + (i.quantity || 1), 0) : 0;
                cartBadge.textContent = count > 0 ? (count > 99 ? '99+' : count) : '';
                cartBadge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (_) {}

        // Favoritos
        try {
            const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
            const favBadge = document.getElementById('favBadge');
            if (favBadge) {
                const count = Array.isArray(favs) ? favs.length : 0;
                favBadge.textContent = count > 0 ? count : '';
                favBadge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (_) {}
    }

    function hookBadgeUpdates() {
        // Cambios desde otras pestañas
        window.addEventListener('storage', function (e) {
            if (e.key === 'cart' || e.key === 'favorites') updateBadges();
        });

        // Parchear localStorage.setItem para detectar cambios en la misma pestaña
        const _setItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function (key, value) {
            _setItem(key, value);
            if (key === 'cart' || key === 'favorites') setTimeout(updateBadges, 0);
        };

        // Cuando la pestaña vuelve a ser visible
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) updateBadges();
        });
    }

    function preventPullToRefresh() {
        let startY = 0;

        document.addEventListener('touchstart', function (e) {
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            const scrollEl = document.getElementById('app-scroll-content');
            if (!scrollEl) return;
            if (scrollEl.scrollTop <= 0 && e.touches[0].clientY > startY) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * En cart.html: inyecta un botón "Pedir por WhatsApp" debajo del total.
     * El botón genera un mensaje con los productos del carrito y abre WhatsApp.
     */
    function injectCartWhatsAppButton() {
        if (!window.location.pathname.includes('cart')) return;
        if (document.getElementById('appModeWaBtn')) return;

        // Esperar a que el carrito esté renderizado
        function tryInject() {
            // Buscar el contenedor del total/resumen del carrito
            const orderSummary = document.querySelector('.order-summary, .cart-summary, .checkout-summary, #orderSummary, #cartSummary');
            const checkoutForm = document.querySelector('.checkout-form, #checkoutForm, form');

            const container = orderSummary || checkoutForm;
            if (!container) return false;

            // No duplicar
            if (document.getElementById('appModeWaBtn')) return true;

            const btn = document.createElement('button');
            btn.id = 'appModeWaBtn';
            btn.className = 'checkout-wa-btn';
            btn.setAttribute('type', 'button');
            btn.setAttribute('aria-label', 'Realizar pedido por WhatsApp');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
                Pedir por WhatsApp
            `;

            btn.addEventListener('click', sendCartViaWhatsApp);

            // Intentar insertar al final del formulario/summary, antes del submit button
            const existingSubmit = container.querySelector('button[type="submit"], .checkout-submit-btn, .place-order-btn, #submitOrderBtn');
            if (existingSubmit) {
                existingSubmit.parentNode.insertBefore(btn, existingSubmit.nextSibling);
            } else {
                container.appendChild(btn);
            }
            return true;
        }

        // Intentar inmediatamente o esperar al DOM
        if (!tryInject()) {
            const observer = new MutationObserver(function () {
                if (tryInject()) observer.disconnect();
            });
            observer.observe(document.body, { childList: true, subtree: true });
            // Fallback timeout
            setTimeout(function () { tryInject(); observer.disconnect(); }, 2000);
        }
    }

    /**
     * Genera el mensaje de WhatsApp con los productos del carrito
     * y redirige a wa.me
     */
    function sendCartViaWhatsApp() {
        const WA_NUMBER = '595976106726';

        let cart = [];
        try { cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch (_) {}

        if (!cart.length) {
            alert('Tu carrito está vacío');
            return;
        }

        const fmt = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 });

        let msg = '🐾 *Nuevo pedido - Petshop Chiquitines*\n\n';
        let total = 0;

        cart.forEach(function (item) {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            msg += `• ${item.name}`;
            if (item.weight) msg += ` (${item.weight})`;
            msg += `\n  Cant: ${item.quantity}  ×  ${fmt.format(item.price)} = *${fmt.format(subtotal)}*\n`;
        });

        msg += `\n💰 *Total: ${fmt.format(total)}*\n`;
        msg += '\n📍 Av. Perú y Gines, Asunción\n';
        msg += '¿Cuál es tu nombre y dirección de entrega?';

        window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
    }

    // ── API pública ─────────────────────────────────────────────────
    window.AppMode = {
        updateBadges: updateBadges,
        isActive: isAppMode,
        sendCartViaWhatsApp: sendCartViaWhatsApp,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();