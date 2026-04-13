/**
 * APP MODE DETECTOR
 * Detecta si la PWA está instalada y personaliza la interfaz
 */

class AppModeDetector {
    constructor() {
        this.isStandalone = this.detectStandaloneMode();
        this.init();
    }

    detectStandaloneMode() {
        // iOS
        if (window.navigator.standalone === true) {
            return true;
        }

        // Android y navegadores modernos
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return true;
        }

        // Verificar user agent para PWA en Android
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('chrome') && userAgent.includes('mobile')) {
            // Podría ser standalone, pero es menos preciso
        }

        return false;
    }

    init() {
        if (this.isStandalone) {
            this.enableAppMode();
        } else {
            this.enableWebMode();
        }

        // Escuchar cambios de display-mode (aunque es raro)
        window.matchMedia('(display-mode: standalone)').addListener((e) => {
            if (e.matches) {
                this.enableAppMode();
            } else {
                this.enableWebMode();
            }
        });
    }

    enableAppMode() {
        console.log('🚀 MODO APP activado');
        document.documentElement.setAttribute('data-app-mode', 'standalone');
        document.body.classList.add('app-mode');

        // Ocultar elementos que no tiene sentido en una app
        this.hideWebElements();
        
        // Mostrar navegación de app
        this.createAppNavigation();
        
        // Agregar safe area para notch
        this.applySafeArea();
        
        // Prevenir comportamientos de web
        this.optimizeForApp();
    }

    enableWebMode() {
        console.log('🌐 MODO WEB activado');
        document.documentElement.setAttribute('data-app-mode', 'web');
        document.body.classList.remove('app-mode');
    }

    hideWebElements() {
        // Elementos que no necesita una app instalada
        const webOnlySelectors = [
            '.install-prompt',
            '.web-banner',
            '.footer-install-cta'
        ];

        webOnlySelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.style.display = 'none');
        });
    }

    createAppNavigation() {
        // Si ya existe, no crear duplicado
        if (document.querySelector('[data-app-nav]')) return;

        const appNav = document.createElement('nav');
        appNav.setAttribute('data-app-nav', 'true');
        appNav.className = 'app-bottom-nav';
        appNav.innerHTML = `
            <a href="index.html" class="nav-item active" data-nav="home">
                <span class="icon">🏠</span>
                <span class="label">Inicio</span>
            </a>
            <a href="products.html" class="nav-item" data-nav="products">
                <span class="icon">🛍️</span>
                <span class="label">Productos</span>
            </a>
            <a href="cart.html" class="nav-item" data-nav="cart">
                <span class="icon">🛒</span>
                <span class="label">Carrito</span>
            </a>
            <a href="#" class="nav-item" data-nav="menu">
                <span class="icon">⋮</span>
                <span class="label">Más</span>
            </a>
        `;

        document.body.appendChild(appNav);

        // Event listeners para navegación
        appNav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Cambiar activo
                appNav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Si es "Más", mostrar menú
                if (item.dataset.nav === 'menu') {
                    e.preventDefault();
                    this.showAppMenu();
                }
            });
        });
    }

    showAppMenu() {
        // Menú flotante para opciones
        const modal = document.createElement('div');
        modal.className = 'app-menu-modal';
        modal.innerHTML = `
            <div class="app-menu-content">
                <h3>Menú</h3>
                <a href="#" onclick="navigator.share({title:'Pet Shop Chiquitines',url:location.href})">📤 Compartir</a>
                <a href="https://wa.me/595976106726" target="_blank">📞 Contacto</a>
                <a href="#" onclick="this.toggleDarkMode()">🌙 Tema</a>
                <button onclick="this.close()">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('button').addEventListener('click', () => modal.remove());
    }

    applySafeArea() {
        // Para notch en iPhone
        const style = document.createElement('style');
        style.textContent = `
            body {
                padding-top: max(1rem, env(safe-area-inset-top));
                padding-bottom: max(60px, env(safe-area-inset-bottom));
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
            }
            .app-bottom-nav {
                padding-bottom: env(safe-area-inset-bottom);
            }
        `;
        document.head.appendChild(style);
    }

    optimizeForApp() {
        // Prevenir zoom en inputs
        document.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('focus', function() {
                this.style.fontSize = '16px'; // Prevenir zoom iOS
            });
        });

        // Permitir web share si está disponible
        if (navigator.share) {
            console.log('Web Share API disponible');
        }

        // Prevenir scroll bounce en iOS
        document.addEventListener('touchmove', (e) => {
            if (!e.target.closest('[data-scrollable]')) {
                // e.preventDefault(); // Descomentar solo si necesitas
            }
        }, false);
    }

    // Método público para detectar modo
    static isAppInstalled() {
        return new AppModeDetector().isStandalone;
    }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AppModeDetector();
    });
} else {
    new AppModeDetector();
}