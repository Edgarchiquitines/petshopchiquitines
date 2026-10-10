/**
 * CONFIGURACIÓN DE PROMO MODAL
 * 
 * Edita este archivo para controlar el promo modal fácilmente
 * Sin necesidad de tocar los HTMLs
 */

'use strict';

// ════════════════════════════════════════════════════════════════
// ⚙️ CONFIGURACIÓN PRINCIPAL - EDITA AQUÍ
// ════════════════════════════════════════════════════════════════

const PROMO_SETTINGS = {
    // ACTIVAR O DESACTIVAR PROMO MODAL
    enabled: false,  // ← CAMBIA A 'false' PARA DESACTIVAR, 'true' PARA ACTIVAR
    
    // IMÁGENES DEL PROMO
    images: [
        {
            url: 'assets/promo.png',
            link: 'https://www.instagram.com/p/DdJ4XbCBMcd/?stkn=aDBwbXI2MXU1NGFq',
            alt: 'Promoción Sorteo Pedigree'
        },
        {
            url: 'assets/promo2.png',
            alt: 'Promoción 2'
        }
    ],
    
    // OPCIONES DE MOSTRADO
    showOncePerSession: true,  // Mostrar solo 1 vez por sesión
    delay: 800,                // Delay en ms antes de mostrar
    
    // DEBUG (PARA TESTING)
    debug: false               // Cambia a 'true' para ver logs en consola
};

// ════════════════════════════════════════════════════════════════
// 🔄 APLICAR CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════

if (PROMO_SETTINGS.enabled) {
    // Solo si está habilitado, usar la configuración
    window.promoConfig = {
        images: PROMO_SETTINGS.images,
        showOncePerSession: PROMO_SETTINGS.showOncePerSession,
        delay: PROMO_SETTINGS.delay
    };

    if (PROMO_SETTINGS.debug) {
        console.log('✅ Promo Modal ACTIVADO');
        console.log('Imágenes:', PROMO_SETTINGS.images);
    }
} else {
    // Si está deshabilitado, crear config vacía
    window.promoConfig = {
        images: [],  // Array vacío = no mostrar nada
        enabled: false
    };

    if (PROMO_SETTINGS.debug) {
        console.log('❌ Promo Modal DESACTIVADO');
    }
}

// ════════════════════════════════════════════════════════════════
// 🎮 COMANDOS PARA CONSOLA (opcional)
// ════════════════════════════════════════════════════════════════

// Usar en consola del navegador (F12):
// promoToggle()         → Activar/Desactivar promo
// promoShow()           → Mostrar promo
// promoHide()           → Ocultar promo
// promoStatus()         → Ver estado actual

window.promoToggle = function() {
    PROMO_SETTINGS.enabled = !PROMO_SETTINGS.enabled;
    location.reload();  // Recargar para aplicar cambios
};

window.promoShow = function() {
    if (window.PromoModal && typeof window.PromoModal.force === 'function') {
        window.PromoModal.force();
        console.log('✅ Promo mostrado');
    } else {
        console.log('❌ PromoModal no está disponible');
    }
};

window.promoHide = function() {
    if (window.PromoModal && typeof window.PromoModal.close === 'function') {
        window.PromoModal.close();
        console.log('✅ Promo cerrado');
    } else {
        console.log('❌ PromoModal no está disponible');
    }
};

window.promoStatus = function() {
    console.log('═══════════════════════════════════');
    console.log('ESTADO ACTUAL DEL PROMO MODAL');
    console.log('═══════════════════════════════════');
    console.log('Estado:', PROMO_SETTINGS.enabled ? '✅ ACTIVADO' : '❌ DESACTIVADO');
    console.log('Imágenes:', PROMO_SETTINGS.images.length);
    console.log('Mostrar una vez por sesión:', PROMO_SETTINGS.showOncePerSession);
    console.log('Delay:', PROMO_SETTINGS.delay + 'ms');
    console.log('═══════════════════════════════════');
};

// Mostrar estado en consola
console.log('%c🎯 PROMO MODAL SYSTEM', 'color: #FF6B35; font-size: 14px; font-weight: bold;');
console.log('%cEscribe en consola: promoStatus()', 'color: #666; font-size: 12px;');
