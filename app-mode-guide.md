# Pet Shop Chiquitines - App Mode PWA

## Descripción

Esta es una versión optimizada del PWA que detecta automáticamente cuando está instalada como app nativa (iOS/Android) y aplica cambios radicales en:

- **Layout**: Diseño full-screen sin bordes de navegador
- **Navegación**: Bottom navigation bar en lugar de header desktop
- **Espacios**: Utiliza todo el viewport disponible
- **Gestos**: Optimizado para touch y swipes
- **Transiciones**: Animaciones suaves entre páginas
- **Tipografía & Colores**: Tema nativo iOS/Android
- **Comportamientos**: Prevención de pull-to-refresh, optimización de rendimiento

---

## 🚀 Cómo Integrar

### Opción 1: Reemplazar HTML existente (RECOMENDADO)

1. **Fusionar el nuevo `index-app-mode.html` con tu `index.html` existente**

   - Copia la estructura de `index-app-mode.html`
   - Los scripts y CSS se cargan automáticamente
   - El archivo detecta si está en modo app y se adapta

2. **Asegurar que los 3 archivos estén en el servidor:**
   - `index.html` (versión nueva con app mode integrado)
   - `app-styles.css` (nuevos estilos para app)
   - `app-mode.js` (lógica de navegación app)

### Opción 2: Reemplazar solo index.html

Usa el archivo `index-app-mode.html` como tu nuevo `index.html` (más limpio).

### Opción 3: Mantener separado (para testing)

Crea una nueva ruta `/app/index.html` si quieres testear sin afectar la versión actual.

---

## 📁 Archivos Necesarios

```
/
├── index.html (NUEVO - usa index-app-mode.html)
├── products.html (sin cambios)
├── cart.html (sin cambios)
├── styles.css (EXISTENTE - sin cambios)
├── app-styles.css (NUEVO)
├── app.js (EXISTENTE - sin cambios)
├── app-mode.js (NUEVO)
├── app.js
├── sw.js
├── manifest.json
├── products.json
├── assets/
│   ├── logo.webp
│   ├── favicon.ico
│   ├── whatsapp.png
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
```

---

## 🎨 Cambios Visuales en App Mode

### En Navegación Web (Desktop/Navegador Mobile)
```
┌─────────────────────────────────────────┐
│ [Logo] Nav | ❤️ 📦 🛒                   │ ← Header desktop
├─────────────────────────────────────────┤
│                                         │
│    Contenido de la página               │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### En App Instalada (iOS/Android)
```
┌─────────────────────────────────────────┐
│ ❤️  📦  🔔                              │ ← Header app (sin logo)
├─────────────────────────────────────────┤
│                                         │
│    Contenido (full viewport)            │
│                                         │
│  (6 WhatsApp FAB aquí)                  │
├─────────────────────────────────────────┤
│ 🏠 📦 ❤️ 🛒                             │ ← Bottom nav (4 items)
└─────────────────────────────────────────┘
```

---

## 🔧 Características Implementadas

### 1. **Detección Automática de App Mode**
- Detecta `display-mode: standalone` (estándar PWA)
- Detecta `navigator.standalone === true` (iOS)
- Detecta intent de Android app

### 2. **Bottom Navigation Bar**
- 4 botones principales: Home, Productos, Favoritos, Carrito
- Badges dinámicos (contador de items)
- Animaciones suaves al cambiar página
- Indicadores visuales de página activa

### 3. **Navegación entre Páginas**
- Transiciones suaves (slideInUp/slideInDown)
- Guardado de scroll position en cada página
- Carga lazy de contenido
- Compatibilidad con URLs internas

### 4. **Gestos Touch Optimizados**
- Prevención de pull-to-refresh en Android
- Feedback visual en tap (0.95x scale)
- Scroll suave con `-webkit-overflow-scrolling: touch`
- Soporte para Safe Area (notch, home indicator)

### 5. **Optimización de Espacios**
- Full viewport sin márgenes extras
- Padding para safe areas (notch, home indicator)
- Grid de productos: 2 columnas (vs 3-5 en desktop)
- Tipografía escalada para mobile

### 6. **Componentes Repositionados**
- Header reducido sin logo
- Footer completamente oculto
- FAB WhatsApp sobre la bottom nav
- Paneles se abren desde abajo (modal style)

### 7. **Rendimiento**
- Carga lazy de imágenes
- Debounce en resize events
- Transiciones GPU-accelerated
- Minimal repaint/reflow

---

## 🎯 Cómo Testear

### En Navegador Desktop
1. Abre DevTools (F12)
2. Simula mobile (Ctrl+Shift+M)
3. Abre DevTools > ... > More tools > Application
4. Simula "display-mode: standalone" (no hay opción nativa)
5. **Mejor:** Instala la app en el móvil real

### En iOS
1. Abre Safari
2. Tap compartir (arriba a la derecha)
3. "Agregar a pantalla de inicio"
4. Ábrela desde la home

### En Android (Chrome)
1. Abre Chrome
2. Tap menú (⋮)
3. "Instalar aplicación"
4. Confirma

### Verificar que funciona
- Bottom nav aparece
- Header se reduce
- Transiciones suaves
- FAB repositionado
- Gestos funcionan

---

## 🛠️ Personalización

### Cambiar colores
En `app-styles.css`, busca `#FF6B35` (naranja):
```css
body.app-mode .bottom-nav-item.active {
    color: #FF6B35; /* Cambiar este color */
}
```

### Cambiar items del bottom nav
En `app-mode.js`, función `setupBottomNav()`:
```javascript
const bottomNav = document.createElement('nav');
bottomNav.className = 'bottom-nav';
bottomNav.innerHTML = `
    <!-- Agregar/quitar botones aquí -->
`;
```

### Cambiar animaciones
En `app-styles.css`:
```css
@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(20px); /* Cambiar distancia */
    }
}
```

### Cambiar breakpoints
En `app-mode.js`, función `detectAppMode()`:
```javascript
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
// Agregar más condiciones si necesario
```

---

## 📊 Tamaños de Viewport Soportados

- **Phones**: 320px - 600px (2 columnas)
- **Tablets**: 600px - 1024px (2 columnas en app mode)
- **Desktop**: 1024px+ (Fallback a versión web normal)

---

## ⚠️ Consideraciones Importantes

### 1. **Mantén los archivos originales**
- `products.html`, `cart.html` siguen siendo accesibles
- Pueden tener su propia versión app o permanecer iguales

### 2. **LocalStorage para badges**
Los badges de carrito y favoritos se leen de:
```javascript
localStorage.getItem('cart')
localStorage.getItem('favorites')
```
Asegurate que tu `app.js` actualice estos valores correctamente.

### 3. **Service Worker Compatible**
El `sw.js` existente sigue funcionando sin cambios. No necesita modificación.

### 4. **Testing en diferentes dispositivos**
- iOS 14+ soporta PWA completo
- Android 5+ soporta PWA con limitaciones
- Algunos Android no permiten pull-to-refresh prevention

### 5. **Safe Areas en notch**
Automáticamente detecta y respeta:
- Top notch (sensor area en iOS)
- Bottom home indicator (iOS)
- Rounded corners (ambas plataformas)

---

## 🔄 Flujo de Ejecución

```
User abre la app instalada
        ↓
app-mode.js se ejecuta
        ↓
Detecta display-mode: standalone
        ↓
Agrega clase .app-mode a <body>
        ↓
CSS de app-styles.css se aplica
        ↓
Crea bottom nav
        ↓
Configura event listeners
        ↓
Previene pull-to-refresh
        ↓
Optimiza viewport
        ↓
✅ App lista para usar
```

---

## 🐛 Debug & Troubleshooting

### Bottom nav no aparece
- Verificar que `app-mode.js` se carga (Network tab en DevTools)
- Verificar que la clase `.app-mode` se agregó a `<body>`
- Verificar `app-styles.css` en Network tab

### Transiciones no funcionan
- Desactivar "Reduce motion" en DevTools
- Verificar que CSS tiene `@keyframes` definidos
- Comprobar que no hay conflictos con CSS existente

### Badges no se actualizan
- Verificar que localStorage tiene las claves correctas
- Debug: `console.log(localStorage.getItem('cart'))`
- Verificar que `app.js` llama a `AppMode.updateBadges()`

### Scroll no funciona
- Verificar que `.app-pages-wrapper` tiene `flex: 1; min-height: 0`
- Verificar que `.app-page.active` no tiene height fijo
- Debug: `console.log(document.querySelector('.app-page').scrollHeight)`

---

## 📱 Tabla de Compatibilidad

| Feature | iOS | Android | Desktop |
|---------|-----|---------|---------|
| Bottom Nav | ✅ | ✅ | ❌ (hidden) |
| Safe Area Support | ✅ | ✅ | N/A |
| Notch Support | ✅ | ⚠️ | N/A |
| Pull-to-Refresh Prevention | ⚠️ | ✅ | N/A |
| Gestos | ✅ | ✅ | N/A |
| Transiciones | ✅ | ✅ | ✅ |

---

## 🚀 Próximos Pasos Sugeridos

1. **Testing en dispositivos reales** (iOS + Android)
2. **Optimizar velocidad de carga** (compresión de imágenes)
3. **Agregar más gestos** (swipe entre páginas)
4. **Implementar notificaciones push** (capacidad PWA)
5. **Analytics para app mode** (rastrear uso)
6. **Pull-to-refresh custom** (para actualizar datos)

---

## 📞 Soporte

Si hay problemas:
1. Verificar Network tab (¿Se cargan los archivos?)
2. Verificar Console (¿Hay errores JavaScript?)
3. Verificar que manifest.json tiene `"display": "standalone"`
4. Probar en otro dispositivo/navegador
5. Limpiar cache del navegador y reinstalar app

---

**Versión:** 1.0  
**Última actualización:** 2026-04-15  
**Compatibilidad:** iOS 12+, Android 5+, Chrome 64+, Edge 79+