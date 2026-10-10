/**
 * PWA AUTO UPDATE SYSTEM
 * 
 * Sistema automático de actualización para PWA
 * - Busca actualizaciones cada 5-10 segundos
 * - Detecta cambios en Service Worker
 * - Recarga automáticamente cuando hay nuevas versiones
 * - Notifica al usuario sobre las actualizaciones
 */

'use strict';

class PWAAutoUpdate {
    constructor(options = {}) {
        // Configuración
        this.checkInterval = options.checkInterval || 10000; // 10 segundos
        this.debug = options.debug || false;
        this.notifyUser = options.notifyUser !== false; // true por defecto
        
        // Estado
        this.isChecking = false;
        this.updateAvailable = false;
        this.waitingServiceWorker = null;
        this.refreshing = false;
        
        // Inicializar
        this.init();
    }

    init() {
        // Solo funciona en PWA instalada
        if (!this.isPWA()) {
            this.log('❌ No es PWA instalada, auto-update desactivado');
            return;
        }

        this.log('✅ PWA Auto-Update inicializado');
        this.log(`Revisando actualizaciones cada ${this.checkInterval}ms`);

        // Escuchar cambios en Service Worker
        this.setupServiceWorkerListeners();

        // Iniciar búsqueda periódica de actualizaciones
        this.startPeriodicCheck();

        // Escuchar instalación de nuevas versiones
        this.setupUpdateListener();
    }

    /**
     * Verificar si es una PWA instalada
     */
    isPWA() {
        // Detectar si es standalone (instalada)
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    }

    /**
     * Configurar listeners del Service Worker
     */
    setupServiceWorkerListeners() {
        if (!('serviceWorker' in navigator)) {
            this.log('⚠️ Service Worker no soportado');
            return;
        }

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.log('🔄 Nuevo Service Worker activado');
            this.notifyUpdateApplied();
        });

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                this.log('📦 Actualización disponible');
                this.handleUpdateAvailable();
            }
        });
    }

    /**
     * Configurar listener para nuevas versiones
     */
    setupUpdateListener() {
        if (!navigator.serviceWorker.controller) return;

        navigator.serviceWorker.controller.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SKIP_WAITING') {
                this.log('⚡ Saltando espera, activando nueva versión');
                this.skipWaiting();
            }
        });

        // Escuchar cambios periódicos
        navigator.serviceWorker.ready.then((registration) => {
            registration.addEventListener('updatefound', () => {
                this.log('🔍 Nueva versión del Service Worker encontrada');
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.log('💾 Nueva versión instalada, lista para usar');
                        this.waitingServiceWorker = newWorker;
                        this.updateAvailable = true;
                        this.handleUpdateAvailable();
                    }
                });
            });
        });
    }

    /**
     * Iniciar búsqueda periódica de actualizaciones
     */
    startPeriodicCheck() {
        setInterval(() => {
            this.checkForUpdates();
        }, this.checkInterval);

        // Verificar también cuando recupera conexión
        window.addEventListener('online', () => {
            this.log('🌐 Conexión recuperada, verificando actualizaciones');
            this.checkForUpdates();
        });
    }

    /**
     * Verificar si hay actualizaciones disponibles
     */
    checkForUpdates() {
        if (this.isChecking || !('serviceWorker' in navigator)) return;

        this.isChecking = true;
        this.log('🔍 Buscando actualizaciones...');

        navigator.serviceWorker.ready
            .then((registration) => {
                return registration.update();
            })
            .then((registration) => {
                if (registration.waiting) {
                    this.log('📦 Actualización encontrada');
                    this.waitingServiceWorker = registration.waiting;
                    this.updateAvailable = true;
                    this.handleUpdateAvailable();
                } else {
                    this.log('✅ PWA actualizada');
                }
                this.isChecking = false;
            })
            .catch((error) => {
                this.log('❌ Error verificando actualizaciones:', error);
                this.isChecking = false;
            });
    }

    /**
     * Manejar actualización disponible
     */
    handleUpdateAvailable() {
        if (!this.updateAvailable) return;

        this.log('💾 Actualización disponible, recargando...');

        if (this.notifyUser) {
            this.showUpdateNotification();
        } else {
            // Auto-reload sin notificación
            this.reloadWithUpdate();
        }
    }

    /**
     * Mostrar notificación de actualización
     */
    showUpdateNotification() {
        // Crear banner superior
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.className = 'pwa-update-banner';
        banner.innerHTML = `
            <div class="pwa-update-content">
                <div class="pwa-update-text">
                    <strong>✨ Actualización disponible</strong>
                    <p>Hay una nueva versión. Toca para actualizar.</p>
                </div>
                <button class="pwa-update-btn" onclick="window.pwAutoUpdate.reloadWithUpdate()">
                    Actualizar
                </button>
                <button class="pwa-update-close" onclick="this.parentElement.parentElement.remove()">
                    ✕
                </button>
            </div>
        `;

        document.body.insertBefore(banner, document.body.firstChild);

        // Auto-cerrar después de 30 segundos si no interactúan
        setTimeout(() => {
            const elem = document.getElementById('pwa-update-banner');
            if (elem) {
                elem.remove();
                this.log('⏱️ Notificación cerrada por timeout');
                // Recargar automáticamente
                this.reloadWithUpdate();
            }
        }, 30000);
    }

    /**
     * Recargar con actualización
     */
    reloadWithUpdate() {
        if (this.refreshing) return;
        this.refreshing = true;

        this.log('🔄 Recargando con nueva actualización...');

        if (this.waitingServiceWorker) {
            // Decirle al Service Worker que se active
            this.waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
        }

        // Recargar después de un pequeño delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    /**
     * Skip waiting (activar nueva versión inmediatamente)
     */
    skipWaiting() {
        if (!this.waitingServiceWorker) return;

        this.waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // Escuchar cuando se controla
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.log('✅ Nueva versión activada');
            window.location.reload();
        });
    }

    /**
     * Notificar que se aplicó actualización
     */
    notifyUpdateApplied() {
        if (!this.notifyUser) return;

        // Mostrar notificación breve
        const notification = document.createElement('div');
        notification.className = 'pwa-update-applied';
        notification.innerHTML = `
            <div class="pwa-update-applied-content">
                ✅ PWA actualizada correctamente
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    /**
     * Logging
     */
    log(...args) {
        if (this.debug) {
            console.log('%c[PWA Auto-Update]', 'color: #FF6B35; font-weight: bold;', ...args);
        }
    }

    // API Pública
    static getInstance(options) {
        if (!window._pwaAutoUpdateInstance) {
            window._pwaAutoUpdateInstance = new PWAAutoUpdate(options);
        }
        return window._pwaAutoUpdateInstance;
    }
}

// ════════════════════════════════════════════════════════════════
// INICIALIZAR SISTEMA
// ════════════════════════════════════════════════════════════════

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwAutoUpdate = PWAAutoUpdate.getInstance({
            checkInterval: 10000,  // 10 segundos
            debug: false,          // Cambiar a true para ver logs
            notifyUser: true       // Mostrar notificación
        });
    });
} else {
    window.pwAutoUpdate = PWAAutoUpdate.getInstance({
        checkInterval: 10000,
        debug: false,
        notifyUser: true
    });
}

// Exponer instancia globalmente
window.PWAAutoUpdate = PWAAutoUpdate;
