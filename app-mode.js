/**
 * App Mode Controller - Pet Shop Chiquitines
 * Enfoque simple: agrega clase al body, CSS hace el resto.
 * NO manipula ni clona DOM existente.
 */

'use strict';

(function () {

    function isAppMode() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true ||
            document.referrer.includes('android-app://')
        );
    }

    function init() {
        if (!isAppMode()) return;

        document.body.classList.add('app-mode');

        wrapContentForScroll();
        injectBottomNav();
        updateBadges();
        hookBadgeUpdates();
        preventPullToRefresh();
    }

    /**
     * Envuelve el contenido principal entre header y footer
     * en un div scrolleable. Esto permite que body sea flex column
     * y solo el contenido scrollee (no el header ni bottom nav).
     */
    function wrapContentForScroll() {
        if (document.getElementById('app-scroll-content')) return;

        const header = document.querySelector('.header');
        const footer = document.querySelector('.footer');

        if (!header) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'app-scroll-content';
        wrapper.className = 'app-scroll-content';

        // Recoger todos los nodos entre el header y el final del body
        // (excluyendo scripts, el FAB de WhatsApp queda fuera para que
        //  sea position:fixed y el bottom nav se agrega después)
        const nodesToWrap = [];
        let node = header.nextSibling;
        while (node) {
            const next = node.nextSibling;
            // Dejar fuera: scripts, el FAB (tiene clase whatsapp-fab), y nodos de texto vacíos
            const isScript = node.nodeType === 1 && node.tagName === 'SCRIPT';
            const isFab    = node.nodeType === 1 && node.classList && node.classList.contains('whatsapp-fab');
            const isText   = node.nodeType === 3;

            if (!isScript && !isFab && !isText) {
                nodesToWrap.push(node);
            }
            node = next;
        }

        nodesToWrap.forEach(n => wrapper.appendChild(n));

        // Insertar el wrapper después del header
        header.insertAdjacentElement('afterend', wrapper);
    }

    function injectBottomNav() {
        if (document.querySelector('.bottom-nav')) return;

        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('aria-label', 'Navegación principal');
        nav.innerHTML = `
            <a href="index.html" class="bottom-nav-item ${isCurrentPage('index') ? 'active' : ''}" aria-label="Inicio">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Inicio</span>
            </a>
            <a href="products.html" class="bottom-nav-item ${isCurrentPage('products') ? 'active' : ''}" aria-label="Productos">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>Productos</span>
            </a>
            <a href="index.html#favorites" class="bottom-nav-item" id="bottomFavBtn" aria-label="Favoritos" style="position:relative;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span class="bn-badge" id="favBadge"></span>
                <span>Favoritos</span>
            </a>
            <a href="cart.html" class="bottom-nav-item ${isCurrentPage('cart') ? 'active' : ''}" aria-label="Carrito" style="position:relative;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span class="bn-badge" id="cartBadge"></span>
                <span>Carrito</span>
            </a>
        `;

        document.body.appendChild(nav);

        // Favoritos: abrir modal si existe la función, sino ir a index.html
        const favBtn = nav.querySelector('#bottomFavBtn');
        if (favBtn) {
            favBtn.addEventListener('click', function (e) {
                if (typeof openFavoritesModal === 'function') {
                    e.preventDefault();
                    openFavoritesModal();
                }
                // Si no hay función, navega normalmente a index.html
            });
        }
    }

    function isCurrentPage(name) {
        const path = window.location.pathname;
        if (name === 'index') return path.endsWith('/') || path.includes('index');
        return path.includes(name);
    }

    function updateBadges() {
        // Carrito
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const cartBadge = document.getElementById('cartBadge');
            if (cartBadge) {
                const count = Array.isArray(cart) ? cart.reduce((s, i) => s + (i.quantity || 1), 0) : 0;
                cartBadge.textContent = count > 0 ? count : '';
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

        // Sync con los counters originales del header también
        syncHeaderCounters();
    }

    function syncHeaderCounters() {
        // Los contadores del header (cartCount, favCount) los maneja app.js,
        // solo actualizamos los badges del bottom nav desde localStorage.
    }

    function hookBadgeUpdates() {
        // Cambios desde otras pestañas
        window.addEventListener('storage', function (e) {
            if (e.key === 'cart' || e.key === 'favorites') {
                updateBadges();
            }
        });

        // Cambios en la misma pestaña — parchear localStorage.setItem
        const _setItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function (key, value) {
            _setItem(key, value);
            if (key === 'cart' || key === 'favorites') {
                // Diferir para que el valor ya esté guardado cuando leemos
                setTimeout(updateBadges, 0);
            }
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

            // Solo cancelar si el contenedor está al tope y se jala hacia abajo
            if (scrollEl.scrollTop <= 0 && e.touches[0].clientY > startY) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // Exponer updateBadges para que app.js pueda llamarlo
    window.AppMode = {
        updateBadges: updateBadges,
        isActive: isAppMode,
    };

    // Ejecutar al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();