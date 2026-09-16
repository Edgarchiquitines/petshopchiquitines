/**
 * PROMO MODAL - Sistema de anuncios promocionales con secuencia de imágenes
 * 
 * Características:
 * - Modal que aparece al cargar la página
 * - Soporta múltiples imágenes que aparecen una después de otra
 * - Primera imagen es clickeable (redirecciona a Instagram)
 * - Otras imágenes son solo para ver
 * - Botón X para pasar a la siguiente imagen
 * - Se puede cerrar clickeando fuera de la imagen
 * - Control de frecuencia (configurable por sesión/día)
 * - Funciona en Desktop, Mobile y PWA
 * 
 * Configuración con múltiples imágenes:
 *   window.promoConfig = {
 *       images: [
 *           {
 *               url: 'assets/promo1.jpg',
 *               link: 'https://instagram.com/...',
 *               alt: 'Promoción 1'
 *           },
 *           {
 *               url: 'assets/promo2.jpg',
 *               alt: 'Promoción 2'  // Sin link = no clickeable
 *           }
 *       ],
 *       showOncePerSession: true,
 *       delay: 500
 *   };
 */

'use strict';

(function () {

    // ── Configuración por defecto ──────────────────────────────────
    const defaultConfig = {
        images: [
            {
                url: 'assets/promo.jpg',
                link: 'https://www.instagram.com/p/DdJ4XbCBMcd/',
                alt: 'Promoción'
            }
        ],
        showOncePerSession: true,
        delay: 500,
        sessionKey: 'promo_modal_shown'
    };

    // Merged config
    let config = { ...defaultConfig };

    // ── Mezclar config global si existe ────────────────────────────
    if (window.promoConfig) {
        // Soporte para config antigua (imageUrl + instagramUrl)
        if (window.promoConfig.imageUrl && !window.promoConfig.images) {
            config = {
                ...config,
                images: [
                    {
                        url: window.promoConfig.imageUrl,
                        link: window.promoConfig.instagramUrl,
                        alt: 'Promoción'
                    }
                ],
                showOncePerSession: window.promoConfig.showOncePerSession !== undefined ? window.promoConfig.showOncePerSession : true,
                delay: window.promoConfig.delay || 500
            };
        } else {
            config = { ...config, ...window.promoConfig };
        }
    }

    // ── Estado del modal ───────────────────────────────────────────
    let modalShown = false;
    let modalElement = null;
    let imageElement = null;
    let closeBtn = null;
    let currentImageIndex = 0;

    /**
     * Crear el HTML del modal
     */
    function createModalHTML() {
        const modalHTML = `
            <div class="promo-modal" id="promoModal">
                <div class="promo-modal-content">
                    <img 
                        src="${config.images[0].url}" 
                        alt="${config.images[0].alt || 'Promoción'}" 
                        class="promo-image" 
                        id="promoImage"
                        loading="lazy"
                    />
                    <button 
                        type="button" 
                        class="promo-close-btn" 
                        id="promoCloseBtn" 
                        aria-label="Siguiente imagen o cerrar"
                    >×</button>
                    
                    <!-- Indicador de progreso -->
                    ${config.images.length > 1 ? `
                        <div class="promo-progress">
                            <span class="promo-counter" id="promoCounter">1 / ${config.images.length}</span>
                            <div class="promo-progress-bar">
                                <div class="promo-progress-fill" id="promoProgressFill" style="width: ${(1 / config.images.length) * 100}%"></div>
                            </div>
                        </div>
                    ` : ''}
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
     * Cambiar a la siguiente imagen
     */
    function nextImage() {
        if (currentImageIndex < config.images.length - 1) {
            currentImageIndex++;
            updateImage();
        } else {
            // Se acabaron las imágenes, cerrar
            closeModal();
        }
    }

    /**
     * Actualizar la imagen actual
     */
    function updateImage() {
        const currentImage = config.images[currentImageIndex];
        
        // Fade out
        imageElement.style.opacity = '0';
        
        setTimeout(() => {
            // Cambiar imagen
            imageElement.src = currentImage.url;
            imageElement.alt = currentImage.alt || 'Promoción';
            
            // Actualizar indicador de progreso
            if (config.images.length > 1) {
                const counter = document.getElementById('promoCounter');
                const progressFill = document.getElementById('promoProgressFill');
                
                if (counter) counter.textContent = `${currentImageIndex + 1} / ${config.images.length}`;
                if (progressFill) {
                    const progress = ((currentImageIndex + 1) / config.images.length) * 100;
                    progressFill.style.width = `${progress}%`;
                }
            }
            
            // Fade in
            imageElement.style.opacity = '1';
        }, 200);
    }

    /**
     * Adjuntar event listeners
     */
    function attachEventListeners() {
        // Botón cerrar/siguiente
        closeBtn.addEventListener('click', () => {
            if (currentImageIndex < config.images.length - 1) {
                // Si no es la última, ir a la siguiente
                nextImage();
            } else {
                // Si es la última, cerrar
                closeModal();
            }
        }, false);

        // Cerrar al hacer clic fuera de la imagen
        modalElement.addEventListener('click', function (e) {
            if (e.target === modalElement) {
                if (currentImageIndex < config.images.length - 1) {
                    nextImage();
                } else {
                    closeModal();
                }
            }
        }, false);

        // Imagen: abrir Instagram (solo si tiene link)
        imageElement.addEventListener('click', function (e) {
            const currentImage = config.images[currentImageIndex];
            
            if (currentImage.link) {
                e.preventDefault();
                setTimeout(function () {
                    window.open(currentImage.link, '_blank', 'noopener,noreferrer');
                }, 100);
                closeModal();
            } else if (currentImageIndex < config.images.length - 1) {
                // Si no tiene link pero no es la última, ir a la siguiente
                nextImage();
            }
        }, false);

        // ESC key para cerrar
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modalElement && modalElement.classList.contains('active')) {
                closeModal();
            }
        }, false);

        // Prevenir zoom en iOS al hacer double-tap
        imageElement.addEventListener('touchend', function (e) {
            if (e.touches.length === 0) {
                // Doble tap detectado
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
        currentImageIndex = 0;
        
        if (!modalElement) {
            injectModal();
        } else {
            updateImage();
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
        next: nextImage,
        init: init,
        config: config,
        currentIndex: () => currentImageIndex,
        totalImages: () => config.images.length
    };

    /**
     * Inicialización
     */
    function init() {
        // Validaciones mínimas
        if (!config.images || config.images.length === 0) {
            console.error('PromoModal: images array es requerido en config');
            return;
        }

        // Validar que cada imagen tiene URL
        config.images.forEach((img, idx) => {
            if (!img.url) {
                console.error(`PromoModal: Imagen ${idx} no tiene URL`);
            }
        });

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