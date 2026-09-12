/**
 * APP NATIVE ENHANCEMENT
 * Mejora la experiencia de la PWA instalada para que se sienta como una app nativa
 * - Gestión de toque y gestos
 * - Notches y safe areas
 * - Animaciones nativas
 * - Status bar integration
 */

'use strict';

(function () {

    // ── Detectar si es app mode ────────────────────────────────────
    function isAppMode() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true ||
            document.referrer.includes('android-app://')
        );
    }

    // ── Inicializar mejoras nativas ────────────────────────────────
    function initNativeMode() {
        if (!isAppMode()) return;

        // Agregar clase app-native
        document.documentElement.classList.add('app-native-mode');

        // Mejorar viewport
        setViewportMeta();

        // Disable pull-to-refresh
        disablePullToRefresh();

        // Optimizar touch events
        optimizeTouchEvents();

        // Mejorar performance
        optimizePerformance();

        // Status bar (si es disponible)
        setStatusBar();

        // Haptic feedback
        enableHapticFeedback();

        // Safe areas
        applySafeAreas();

        console.log('[APP] Modo nativo activado');
    }

    // ── Mejorar viewport ────────────────────────────────────────────
    function setViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }

        // Viewport optimizado para app nativa
        viewport.setAttribute('content', 
            'width=device-width, ' +
            'initial-scale=1.0, ' +
            'maximum-scale=1.0, ' +
            'user-scalable=no, ' +
            'viewport-fit=cover, ' +
            'minimal-ui'
        );
    }

    // ── Deshabilitar pull-to-refresh ────────────────────────────────
    function disablePullToRefresh() {
        let touchStartY = 0;

        document.addEventListener('touchstart', function (e) {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            const scrollElement = document.getElementById('app-scroll-content') || document.documentElement;
            
            if (scrollElement.scrollTop <= 0 && e.touches[0].clientY > touchStartY) {
                // Prevenir pull-to-refresh
                e.preventDefault();
            }
        }, { passive: false });
    }

    // ── Optimizar touch events ──────────────────────────────────────
    function optimizeTouchEvents() {
        // Remover delay de 300ms en clickeos
        document.addEventListener('touchend', function (e) {
            const touch = e.changedTouches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);

            if (element && (element.tagName === 'BUTTON' || element.tagName === 'A')) {
                element.click();
            }
        }, false);

        // Mejorar feedback visual en clics
        document.addEventListener('touchstart', function (e) {
            const target = e.target.closest('button, a, [role="button"]');
            if (target) {
                target.style.opacity = '0.85';
            }
        }, false);

        document.addEventListener('touchend', function (e) {
            const target = e.target.closest('button, a, [role="button"]');
            if (target) {
                target.style.opacity = '1';
            }
        }, false);
    }

    // ── Optimizar performance ──────────────────────────────────────
    function optimizePerformance() {
        // Lazy load images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, { rootMargin: '50px' });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }

        // Reducir repaints
        requestAnimationFrame(function optimizeDOM() {
            // El DOM ya está optimizado
            requestAnimationFrame(optimizeDOM);
        });
    }

    // ── Status bar (Cordova/Capacitor) ─────────────────────────────
    function setStatusBar() {
        // Si está disponible StatusBar de Cordova
        if (window.StatusBar) {
            StatusBar.styleDefault();
            StatusBar.backgroundColorByHexString('#FFFFFF');
        }

        // Si está disponible App de Capacitor
        if (window.Capacitor) {
            try {
                window.Capacitor.Plugins.StatusBar?.setBackgroundColor?.({
                    color: '#FFFFFF'
                });
            } catch (e) {
                // No disponible
            }
        }
    }

    // ── Haptic feedback (vibración) ────────────────────────────────
    function enableHapticFeedback() {
        if (!('vibrate' in navigator)) return;

        document.addEventListener('click', function (e) {
            const target = e.target.closest('button, a, [role="button"]');
            if (target) {
                // Vibración corta
                navigator.vibrate(10);
            }
        }, false);
    }

    // ── Aplicar safe areas ──────────────────────────────────────────
    function applySafeAreas() {
        const root = document.documentElement;
        
        // Obtener safe areas del viewport
        const safeTop = getComputedStyle(root).getPropertyValue('--app-safe-area-top') || '0px';
        const safeBottom = getComputedStyle(root).getPropertyValue('--app-safe-area-bottom') || '0px';
        const safeLeft = getComputedStyle(root).getPropertyValue('--app-safe-area-left') || '0px';
        const safeRight = getComputedStyle(root).getPropertyValue('--app-safe-area-right') || '0px';

        // Aplicar a elementos críticos
        const header = document.querySelector('.header');
        if (header) {
            header.style.paddingTop = safeTop;
            header.style.paddingLeft = safeLeft;
            header.style.paddingRight = safeRight;
        }

        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.paddingBottom = safeBottom;
            bottomNav.style.paddingLeft = safeLeft;
            bottomNav.style.paddingRight = safeRight;
        }
    }

    // ── Notificaciones tipo toast ──────────────────────────────────
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #1A1A1A;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ── Manejo de conexión ─────────────────────────────────────────
    function handleNetworkStatus() {
        window.addEventListener('online', function () {
            showToast('📡 Conexión restaurada');
        });

        window.addEventListener('offline', function () {
            showToast('⚠️ Sin conexión a internet');
        });
    }

    // ── Back button handler (Android) ──────────────────────────────
    function handleBackButton() {
        // En PWA, el back button del hardware funciona automáticamente
        // Pero podemos mejorar la experiencia
        
        document.addEventListener('backbutton', function (e) {
            e.preventDefault();
            
            // Si hay un modal abierto, cerrar
            const modals = document.querySelectorAll('[role="dialog"]');
            if (modals.length > 0) {
                const lastModal = modals[modals.length - 1];
                if (lastModal.classList.contains('active')) {
                    if (typeof closeModal === 'function') {
                        closeModal();
                        return;
                    }
                }
            }

            // Si no, ir atrás
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // Si no hay historial, minimizar app
                if (window.Capacitor) {
                    window.Capacitor.Plugins.App?.exitApp?.();
                }
            }
        }, false);
    }

    // ── Full screen support ────────────────────────────────────────
    function enableFullScreen() {
        // Intentar activar full screen si está disponible
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                // Full screen no disponible, ignorar
            });
        }
    }

    // ── Animación de carga ─────────────────────────────────────────
    window.showAppLoading = function () {
        const spinner = document.createElement('div');
        spinner.className = 'app-spinner';
        spinner.id = 'appSpinner';
        document.body.appendChild(spinner);
    };

    window.hideAppLoading = function () {
        const spinner = document.getElementById('appSpinner');
        if (spinner) spinner.remove();
    };

    // ── Exportar API pública ───────────────────────────────────────
    window.AppNative = {
        isAppMode: isAppMode,
        showToast: showToast,
        init: initNativeMode
    };

    // ── Inicializar ────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNativeMode);
    } else {
        initNativeMode();
    }

    // ── Event listeners adicionales ────────────────────────────────
    handleNetworkStatus();
    handleBackButton();

})();
