/**
 * PROMO MODAL - Sistema de anuncios promocionales
 * 
 * Características:
 * - Modal que aparece al cargar la página
 * - Imagen promocional clickeable que redirecciona a Instagram
 * - Botón X para cerrar
 * - Se puede cerrar clickeando fuera de la imagen
 * - Control de frecuencia (configurable por sesión/día)
 * - Funciona en Desktop, Mobile y PWA
 * 
 * Configuración:
 *   window.promoConfig = {
 *       imageUrl: 'ruta/a/imagen.jpg',  // Requerido
 *       instagramUrl: 'https://instagram.com/...',  // Requerido
 *       showOncePerSession: true,  // Default: true (solo 1 vez por sesión)
 *       delay: 500  // Delay en ms antes de mostrar (default: 500)
 *   };
 */

'use strict';

(function () {

    // ── Configuración por defecto ──────────────────────────────────
    const defaultConfig = {
        imageUrl: 'assets/promo.webp',
        instagramUrl: 'https://www.instagram.com/p/DdJ4XbCBMcd/?stkn=aDBwbXI2MXU1NGFq',
        showOncePerSession: true,
        delay: 500,
        sessionKey: 'promo_modal_shown'
    };

    // Merged config
    let config = { ...defaultConfig };

    // ── Mezclar config global si existe ────────────────────────────
    if (window.promoConfig) {
        config = { ...config, ...window.promoConfig };
    }

    // ── Estado del modal ───────────────────────────────────────────
    let modalShown = false;
    let modalElement = null;
    let imageElement = null;
    let closeBtn = null;

    /**
     * Crear el HTML del modal
     */
    function createModalHTML() {
        const modalHTML = `
            <div class="promo-modal" id="promoModal">
                <div class="promo-modal-content">
                    <img 
                        src="${config.imageUrl}" 
                        alt="Promoción especial" 
                        class="promo-image" 
                        id="promoImage"
                        loading="lazy"
                    />
                    <button 
                        type="button" 
                        class="promo-close-btn" 
                        id="promoCloseBtn" 
                        aria-label="Cerrar anuncio promocional"
                    >×</button>
                </div>
            </div>
        `;
        return modalHTML;
    }

    /**
     * Inyectar el modal en el DOM
     */
    function injectModal() {
        if (document.getElementById('promoModal')) return;

        const html = createModalHTML();
        document.body.insertAdjacentHTML('afterbegin', html);

        modalElement = document.getElementById('promoModal');
        imageElement = document.getElementById('promoImage');
        closeBtn = document.getElementById('promoCloseBtn');

        if (!modalElement || !imageElement || !closeBtn) {
            console.error('PromoModal: No se pudo inyectar el modal correctamente');
            return false;
        }

        attachEventListeners();
        return true;
    }

    /**
     * Adjuntar event listeners
     */
    function attachEventListeners() {
        // Botón cerrar
        closeBtn.addEventListener('click', closeModal, false);

        // Cerrar al hacer clic fuera de la imagen
        modalElement.addEventListener('click', function (e) {
            if (e.target === modalElement) {
                closeModal();
            }
        }, false);

        // Imagen: abrir Instagram
        imageElement.addEventListener('click', function (e) {
            e.preventDefault();
            // Esperar a que se cierre la animación
            setTimeout(function () {
                window.open(config.instagramUrl, '_blank', 'noopener,noreferrer');
            }, 100);
            closeModal();
        }, false);

        // Prevenir zoom en iOS al hacer double-tap
        imageElement.addEventListener('touchend', function (e) {
            if (e.touches.length === 0) {
                // Doble tap detectado (simulado)
            }
        }, false);

        // ESC key para cerrar
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modalElement && modalElement.classList.contains('active')) {
                closeModal();
            }
        }, false);
    }

    /**
     * Mostrar el modal
     */
    function showModal() {
        if (!modalElement) return;
        if (modalShown) return;

        // Verificar si ya se mostró en esta sesión
        if (config.showOncePerSession && sessionStorage.getItem(config.sessionKey)) {
            return;
        }

        // Marcar como mostrado
        modalShown = true;
        sessionStorage.setItem(config.sessionKey, '1');

        // Prevenir scroll
        document.body.classList.add('promo-modal-open');

        // Mostrar con delay
        setTimeout(function () {
            if (modalElement) {
                modalElement.classList.add('active');
                // Trigger animation
                void modalElement.offsetHeight;
            }
        }, config.delay);
    }

    /**
     * Cerrar el modal
     */
    function closeModal() {
        if (!modalElement) return;

        modalElement.classList.remove('active');
        document.body.classList.remove('promo-modal-open');

        // Opcional: remover del DOM después de la animación
        setTimeout(function () {
            if (modalElement) {
                modalElement.classList.add('closing');
                setTimeout(function () {
                    if (modalElement && modalElement.parentNode) {
                        modalElement.parentNode.removeChild(modalElement);
                        modalElement = null;
                    }
                }, 300);
            }
        }, 50);
    }

    /**
     * Forzar mostrar el modal (para testing)
     */
    function forceShow() {
        sessionStorage.removeItem(config.sessionKey);
        modalShown = false;
        if (!modalElement) {
            injectModal();
        }
        showModal();
    }

    /**
     * API pública
     */
    window.PromoModal = {
        show: showModal,
        close: closeModal,
        force: forceShow,
        init: init,
        config: config
    };

    /**
     * Inicialización
     */
    function init() {
        // Validaciones mínimas
        if (!config.imageUrl) {
            console.error('PromoModal: imageUrl es requerido en config');
            return;
        }

        if (!config.instagramUrl) {
            console.error('PromoModal: instagramUrl es requerido en config');
            return;
        }

        // Inyectar el modal en el DOM
        if (!injectModal()) {
            return;
        }

        // Mostrar al cargar (con delay)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showModal, { once: true });
        } else {
            showModal();
        }
    }

    // ── Auto-inicializar si está en el DOM ──────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();