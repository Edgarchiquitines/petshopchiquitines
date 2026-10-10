/**
 * MEJORAS DE UX/UI
 * - Modales deslizables (drag & drop)
 * - Skeletons al cargar
 * - Tarjetas responsivas
 */

'use strict';

// ── SISTEMA DE MODALES DESLIZABLES ────────────────────────────
class DraggableModal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) return;

        this.overlay = this.createOverlay();
        this.isDragging = false;
        this.startY = 0;
        this.currentY = 0;
        this.velocity = 0;
        this.lastY = 0;
        this.lastTime = 0;

        this.init();
    }

    createOverlay() {
        let overlay = document.getElementById('modal-overlay-' + this.modal.id);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay-' + this.modal.id;
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    init() {
        // Handle del modal (para arrastrar)
        const handle = this.modal.querySelector('.modal-handle');
        if (handle) {
            handle.addEventListener('pointerdown', (e) => this.startDrag(e));
        }

        // Cerrar con botón X
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Cerrar al clickear overlay
        this.overlay.addEventListener('click', () => this.close());

        // Eventos globales
        document.addEventListener('pointermove', (e) => this.drag(e));
        document.addEventListener('pointerup', () => this.endDrag());

        // Prevenir scroll cuando modal está abierto
        this.modal.addEventListener('touchmove', (e) => {
            const content = this.modal.querySelector('.modal-content');
            if (content && content.scrollHeight > content.clientHeight) {
                // Permitir scroll dentro del modal
                return;
            }
            e.preventDefault();
        }, { passive: false });
    }

    startDrag(e) {
        this.isDragging = true;
        this.startY = e.clientY || e.touches?.[0].clientY || 0;
        this.currentY = 0;
        this.velocity = 0;
        this.lastY = this.startY;
        this.lastTime = Date.now();
        this.modal.style.cursor = 'grabbing';
    }

    drag(e) {
        if (!this.isDragging) return;

        const y = e.clientY || e.touches?.[0].clientY || 0;
        this.currentY = y - this.startY;

        // Solo arrastrar hacia abajo
        if (this.currentY < 0) this.currentY = 0;

        // Limitar arrastre máximo
        if (this.currentY > 200) this.currentY = 200;

        this.modal.style.transform = `translateY(${this.currentY}px)`;
        this.overlay.style.opacity = Math.max(0, 1 - this.currentY / 200);

        // Calcular velocidad
        const now = Date.now();
        const dt = Math.max(1, now - this.lastTime);
        this.velocity = (y - this.lastY) / dt;
        this.lastY = y;
        this.lastTime = now;
    }

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.modal.style.cursor = 'default';

        // Threshold para cerrar (150px o velocidad > 1px/ms)
        const shouldClose = this.currentY > 100 || this.velocity > 1;

        if (shouldClose) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.modal.classList.add('active');
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.modal.style.transform = 'translateY(0)';
        this.overlay.style.opacity = '1';
        this.currentY = 0;
    }

    close() {
        this.modal.classList.remove('active');
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.modal.style.transform = 'translateY(100%)';
        this.overlay.style.opacity = '0';
        this.currentY = 0;
    }

    toggle() {
        if (this.modal.classList.contains('active')) {
            this.close();
        } else {
            this.open();
        }
    }
}

// ── INICIALIZAR MODALES DESLIZABLES ────────────────────────────
function initDraggableModals() {
    const modals = ['favoritesModal', 'ordersModal', 'filtersModal'];
    window.modals = {};

    modals.forEach(id => {
        if (document.getElementById(id)) {
            window.modals[id] = new DraggableModal(id);
        }
    });
}

// Exponer funciones globales
window.openFavoritesModal = function() {
    window.modals?.favoritesModal?.open();
};
window.openOrdersModal = function() {
    window.modals?.ordersModal?.open();
};
window.openFiltersModal = function() {
    window.modals?.filtersModal?.open();
};

// ── SKELETONS AL CARGAR ────────────────────────────────────────
class SkeletonLoader {
    constructor(containerId, count = 8) {
        this.container = document.getElementById(containerId);
        this.count = count;
    }

    show() {
        if (!this.container) return;

        this.container.innerHTML = '';
        for (let i = 0; i < this.count; i++) {
            this.container.appendChild(this.createSkeletonCard());
        }
    }

    createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'product-card skeleton-card';
        card.innerHTML = `
            <div class="product-image">
                <div class="skeleton skeleton-image"></div>
            </div>
            <div class="product-content">
                <div class="skeleton skeleton-text large"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-price"></div>
                <div style="display: flex; gap: 8px;">
                    <div class="skeleton skeleton-text" style="flex: 1; height: 12px;"></div>
                    <div class="skeleton skeleton-text" style="flex: 1; height: 12px;"></div>
                </div>
            </div>
        `;
        return card;
    }

    hide() {
        if (!this.container) return;
        this.container.innerHTML = '';
    }
}

// ── USAR SKELETONS EN CARGA DE PRODUCTOS ────────────────────────
window.showProductSkeletons = function(containerId = 'productsGrid', count = 8) {
    const loader = new SkeletonLoader(containerId, count);
    loader.show();
    window.currentSkeletonLoader = loader;
};

window.hideProductSkeletons = function() {
    if (window.currentSkeletonLoader) {
        window.currentSkeletonLoader.hide();
    }
};

// ── INICIALIZAR TODO ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar modales deslizables
    initDraggableModals();

    // Mostrar skeletons al cargar la página
    showProductSkeletons('productsGrid', 8);

    // Ocultar después de 3 segundos (o cuando termine la carga real)
    setTimeout(() => {
        hideProductSkeletons();
    }, 3000);
});

// ── HELPER: Actualizar filtros con mejor estilo ────────────────
window.enhanceFilters = function() {
    // Agregar clases a selects
    document.querySelectorAll('select').forEach(select => {
        select.classList.add('filter-select');
    });

    // Agregar clases a checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        const wrapper = checkbox.parentElement;
        wrapper?.classList.add('filter-checkbox');
    });

    // Agregar clases a radio buttons (categorías)
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        const wrapper = radio.parentElement;
        wrapper?.classList.add('category-item');
        
        if (radio.checked) {
            wrapper?.classList.add('active');
        }

        radio.addEventListener('change', () => {
            document.querySelectorAll('input[type="radio"][name="' + radio.name + '"]').forEach(r => {
                r.parentElement?.classList.remove('active');
            });
            wrapper?.classList.add('active');
        });
    });
};

// Ejecutar enhancement cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(enhanceFilters, 500);
});
