'use strict';

// products-page.js
// Lógica exclusiva de products.html, extraída del script inline.
// Depende de app.js (debe cargarse antes).

// ── Estado global ────────────────────────────────────────────────
let allProducts      = [];
let filteredProducts = [];
let priceMin         = 0;
let priceMax         = 1000000;
let globalPriceMin   = 0;
let globalPriceMax   = 1000000;
let autocompleteDebounce = null;

// ── Paginación ───────────────────────────────────────────────────
const PAGE_SIZE     = 30;
let   renderedCount = 0;
let   isLoadingMore = false;

// ── Caché de versión ─────────────────────────────────────────────
// _lsGet y _lsSet viven en app.js
const PRODUCTS_VERSION = 'v1';
const CACHE_KEY        = 'productsCache';
const CACHE_VER_KEY    = 'productsCacheVersion';

// INIT

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupFilterToggle();
    setupScrollBehavior();
    setupAutocompleteClose();
    setupInfiniteScroll();
});

// CARGA DE PRODUCTOS — cache-first + fetch en background

async function loadProducts() {
    const cachedVersion = _lsGet(CACHE_VER_KEY, null);
    const cachedData    = _lsGet(CACHE_KEY, null);

    if (cachedData && cachedData.length && cachedVersion === PRODUCTS_VERSION) {
        allProducts = cachedData;
        _bootstrapFilters();
        applyFilters();
    }

    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const freshData = await response.json();
        const fresh = freshData.filter(p => p.id !== undefined && p.name !== undefined);

        _lsSet(CACHE_KEY, fresh);
        _lsSet(CACHE_VER_KEY, PRODUCTS_VERSION);

        // ── Optimización: comparación ligera en lugar de JSON.stringify ──
        const changed = _productsChanged(fresh, cachedData);
        if (changed) {
            allProducts = fresh;
            _bootstrapFilters();
            applyFilters();
        }
    } catch (error) {
        console.error('Error al cargar products.json:', error);
        if (!allProducts.length) {
            const grid = document.getElementById('productsGrid');
            grid.setAttribute('aria-busy', 'false');
            grid.innerHTML = '<div class="empty-state"><p>Error al cargar productos. Revisá tu conexión.</p></div>';
            document.getElementById('productsCount').textContent = '';
        }
    }
}

function _bootstrapFilters() {
    const prices = allProducts.map(p => p.price).filter(p => typeof p === 'number');
    if (prices.length) {
        initPriceRange(
            Math.floor(Math.min(...prices) / 1000) * 1000,
            Math.ceil(Math.max(...prices)  / 1000) * 1000
        );
    }

    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort();
    ['brandFilter', 'brandFilterMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        while (el.options.length > 1) el.remove(1);
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            el.appendChild(option);
        });
    });

    _applyURLParams();
}

function _applyURLParams() {
    const params   = new URLSearchParams(window.location.search);
    const pet      = params.get('pet');
    const category = params.get('category');
    const brand    = params.get('brand');
    const sort     = params.get('sort');
    const search   = params.get('q');
    const pmin     = params.get('pmin');
    const pmax     = params.get('pmax');

    if (pet)      { ['petTypeFilter','petTypeFilterMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = pet; }); }
    if (category) { ['categoryFilter','categoryFilterMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = category; }); }
    if (brand)    { ['brandFilter','brandFilterMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = brand; }); }
    if (sort)     { ['sortFilter','sortFilterMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = sort; }); }
    if (search)   {
        ['searchInput','searchInputSidebar','searchInputMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = search; });
        ['searchClearTop','searchClearMobile','searchClearSidebar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
    }
    if (pmin || pmax) {
        const minVal = pmin ? parseInt(pmin) : globalPriceMin;
        const maxVal = pmax ? parseInt(pmax) : globalPriceMax;
        priceMin = minVal; priceMax = maxVal;
        ['Desktop','Mobile'].forEach(s => {
            const minEl = document.getElementById('priceMin'+s);
            const maxEl = document.getElementById('priceMax'+s);
            if (minEl) minEl.value = minVal;
            if (maxEl) maxEl.value = maxVal;
        });
        syncPriceRange('Desktop');
    }
}

// FILTROS Y DISPLAY
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category   = document.getElementById('categoryFilter').value;
    const petType    = document.getElementById('petTypeFilter').value;
    const brand      = document.getElementById('brandFilter').value;
    const sort       = document.getElementById('sortFilter').value;

    filteredProducts = [...allProducts];

    if (searchTerm) filteredProducts = filteredProducts.filter(p =>
        p.name?.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm) ||
        p.brand?.toLowerCase().includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm)
    );
    if (category) filteredProducts = filteredProducts.filter(p => p.category === category);
    if (petType)  filteredProducts = filteredProducts.filter(p =>
        Array.isArray(p.petType) ? p.petType.includes(petType) : p.petType === petType
    );
    if (brand)    filteredProducts = filteredProducts.filter(p => p.brand === brand);
    filteredProducts = filteredProducts.filter(p => p.price >= priceMin && p.price <= priceMax);

    if (sort === 'price-asc')       filteredProducts.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
    else if (sort === 'name-asc')   filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'name-desc')  filteredProducts.sort((a, b) => b.name.localeCompare(a.name));

    renderedCount = 0;
    displayProducts();
    updateFilterCount();
    syncURL(searchTerm, category, petType, brand, sort);
}

function displayProducts() {
    const grid  = document.getElementById('productsGrid');
    const count = document.getElementById('productsCount');
    grid.setAttribute('aria-busy', 'false');

    count.textContent = `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''}`;

    if (filteredProducts.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>No se encontraron productos</p><button onclick="clearFilters()">Limpiar filtros</button></div>`;
        return;
    }

    const firstBatch = filteredProducts.slice(0, PAGE_SIZE);
    grid.innerHTML   = firstBatch.map(product => createProductCard(product)).join('');
    renderedCount    = firstBatch.length;

    _scheduleFitNames();
}

function _renderNextBatch() {
    if (isLoadingMore) return;
    if (renderedCount >= filteredProducts.length) return;

    isLoadingMore = true;
    const indicator = document.getElementById('loadMoreIndicator');
    if (indicator) indicator.style.display = 'block';

    setTimeout(() => {
        const grid      = document.getElementById('productsGrid');
        const nextBatch = filteredProducts.slice(renderedCount, renderedCount + PAGE_SIZE);
        const fragment  = document.createDocumentFragment();
        const wrapper   = document.createElement('div');
        wrapper.innerHTML = nextBatch.map(createProductCard).join('');
        while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
        grid.appendChild(fragment);

        renderedCount += nextBatch.length;
        isLoadingMore  = false;
        if (indicator) indicator.style.display = 'none';

        _scheduleFitNames();
    }, 50);
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('loadMoreSentinel');
    if (!sentinel || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) _renderNextBatch();
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
}

function _scheduleFitNames() {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(fitAndObserveProductNames, { timeout: 500 });
    } else {
        setTimeout(fitAndObserveProductNames, 100);
    }
}

// AUTOCOMPLETE
function handleAutocomplete(inputEl, dropdownId) {
    applyFilters();
    const query    = inputEl.value.trim().toLowerCase();
    const dropdown = document.getElementById(dropdownId);
    const clearBtnId = inputEl.id === 'searchInput' ? 'searchClearTop'
                     : inputEl.id === 'searchInputMobile' ? 'searchClearMobile'
                     : 'searchClearSidebar';
    const clearBtn = document.getElementById(clearBtnId);
    if (clearBtn) clearBtn.style.display = inputEl.value ? 'flex' : 'none';

    if (!query || query.length < 2) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('autocomplete-dropdown--open');
        return;
    }
    clearTimeout(autocompleteDebounce);
    autocompleteDebounce = setTimeout(() => {
        const suggestions = buildSuggestions(query);
        renderAutocomplete(dropdown, suggestions, inputEl);
    }, 150);
}

function buildSuggestions(query) {
    const results = [], seen = new Set();
    const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
    brands.forEach(brand => {
        if (brand.toLowerCase().includes(query) && !seen.has('brand:' + brand)) {
            seen.add('brand:' + brand);
            results.push({ type: 'brand', label: brand, icon: '🏷️' });
        }
    });
    allProducts.forEach(p => {
        if (results.filter(r => r.type === 'product').length >= 6) return;
        if ((p.name?.toLowerCase().includes(query) || p.brand?.toLowerCase().includes(query)) && !seen.has('product:' + p.name)) {
            seen.add('product:' + p.name);
            results.push({ type: 'product', label: p.name, sub: p.brand, icon: '📦' });
        }
    });
    return results.slice(0, 8);
}

function renderAutocomplete(dropdown, suggestions, inputEl) {
    if (!suggestions.length) {
        dropdown.innerHTML = '<div class="autocomplete-empty" role="option">Sin resultados</div>';
        dropdown.classList.add('autocomplete-dropdown--open');
        return;
    }
    dropdown.innerHTML = suggestions.map((s, i) =>
        `<div class="autocomplete-item" role="option" data-index="${i}"
            onmousedown="selectSuggestion('${escapeHtml(s.label)}', '${inputEl.id}', event)">
            <span class="autocomplete-icon" aria-hidden="true">${s.icon}</span>
            <div class="autocomplete-text">
                <span class="autocomplete-label">${highlightMatch(s.label, inputEl.value.trim())}</span>
                ${s.sub ? `<span class="autocomplete-sub">${s.sub}</span>` : ''}
            </div>
            ${s.type === 'brand' ? '<span class="autocomplete-tag">Marca</span>' : ''}
        </div>`
    ).join('');
    dropdown.classList.add('autocomplete-dropdown--open');
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function selectSuggestion(label, inputId, event) {
    event.preventDefault();
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = label;
    ['searchInput', 'searchInputSidebar', 'searchInputMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = label;
    });
    closeAllDropdowns();
    ['searchClearTop', 'searchClearMobile', 'searchClearSidebar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    });
    applyFilters();
}

function clearSearch(inputId, dropdownId) {
    ['searchInput', 'searchInputSidebar', 'searchInputMobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['searchClearTop', 'searchClearMobile', 'searchClearSidebar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    closeAllDropdowns();
    applyFilters();
}

function closeAllDropdowns() {
    document.querySelectorAll('.autocomplete-dropdown').forEach(d => {
        d.innerHTML = '';
        d.classList.remove('autocomplete-dropdown--open');
    });
}

function setupAutocompleteClose() {
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-bar--autocomplete')) closeAllDropdowns();
    }, { passive: true });
}

// ── escapeHtml corregido (punto 11): escapa &, <, > además de comillas ──
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// PRICE RANGE
function syncPriceRange(suffix) {
    const minEl  = document.getElementById('priceMin' + suffix);
    const maxEl  = document.getElementById('priceMax' + suffix);
    let minVal   = parseInt(minEl.value);
    let maxVal   = parseInt(maxEl.value);
    if (minVal > maxVal) {
        if (document.activeElement === minEl) { minEl.value = maxVal; minVal = maxVal; }
        else { maxEl.value = minVal; maxVal = minVal; }
    }
    priceMin = minVal; priceMax = maxVal;
    const otherSuffix = suffix === 'Desktop' ? 'Mobile' : 'Desktop';
    const otherMin = document.getElementById('priceMin' + otherSuffix);
    const otherMax = document.getElementById('priceMax' + otherSuffix);
    if (otherMin) otherMin.value = minVal;
    if (otherMax) otherMax.value = maxVal;
    ['Desktop', 'Mobile'].forEach(s => {
        const minLabel = document.getElementById('priceMinLabel' + s);
        const maxLabel = document.getElementById('priceMaxLabel' + s);
        if (minLabel) minLabel.textContent = formatPriceShort(minVal);
        if (maxLabel) maxLabel.textContent = formatPriceShort(maxVal);
        updatePriceFill(s);
    });
}

function updatePriceFill(suffix) {
    const minEl = document.getElementById('priceMin' + suffix);
    const maxEl = document.getElementById('priceMax' + suffix);
    const fill  = document.getElementById('priceFill' + suffix);
    if (!minEl || !maxEl || !fill) return;
    const rangeTotal = globalPriceMax - globalPriceMin;
    if (rangeTotal === 0) return;
    fill.style.left  = ((parseInt(minEl.value) - globalPriceMin) / rangeTotal * 100) + '%';
    fill.style.right = ((globalPriceMax - parseInt(maxEl.value)) / rangeTotal * 100) + '%';
}

function formatPriceShort(val) {
    if (val >= 1000000) return 'Gs ' + (val / 1000000).toFixed(1).replace('.0', '') + 'Millon';
    if (val >= 1000)    return 'Gs ' + (val / 1000).toFixed(0) + 'Mil';
    return 'Gs ' + val;
}

function initPriceRange(min, max) {
    globalPriceMin = min; globalPriceMax = max; priceMin = min; priceMax = max;
    ['Desktop', 'Mobile'].forEach(s => {
        const minEl = document.getElementById('priceMin' + s);
        const maxEl = document.getElementById('priceMax' + s);
        if (!minEl || !maxEl) return;
        minEl.min = min; minEl.max = max; minEl.value = min;
        minEl.step = Math.max(1000, Math.floor((max - min) / 100));
        maxEl.min = min; maxEl.max = max; maxEl.value = max;
        maxEl.step = Math.max(1000, Math.floor((max - min) / 100));
        const minLabel = document.getElementById('priceMinLabel' + s);
        const maxLabel = document.getElementById('priceMaxLabel' + s);
        if (minLabel) minLabel.textContent = formatPriceShort(min);
        if (maxLabel) maxLabel.textContent = formatPriceShort(max);
        updatePriceFill(s);
    });
}

// SYNC SEARCH & FILTERS
function syncSearch(source, targetId) {
    const target = document.getElementById(targetId);
    if (target) target.value = source.value;
    const mobileInput = document.getElementById('searchInputMobile');
    if (mobileInput && source.id !== 'searchInputMobile') mobileInput.value = source.value;
    if (source.id === 'searchInputMobile') {
        const topInput     = document.getElementById('searchInput');
        const sidebarInput = document.getElementById('searchInputSidebar');
        if (topInput) topInput.value = source.value;
        if (sidebarInput) sidebarInput.value = source.value;
    }
    ['searchInput','searchInputMobile','searchInputSidebar'].forEach((id, i) => {
        const el  = document.getElementById(id);
        const btnIds = ['searchClearTop','searchClearMobile','searchClearSidebar'];
        const btn = document.getElementById(btnIds[i]);
        if (el && btn) btn.style.display = el.value ? 'flex' : 'none';
    });
}

function syncFilter(desktopId, mobileSelect) {
    const desktop = document.getElementById(desktopId);
    if (desktop) desktop.value = mobileSelect.value;
}

function clearFilters() {
    ['searchInput','searchInputSidebar','searchInputMobile'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    ['searchClearTop','searchClearMobile','searchClearSidebar'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    ['categoryFilter','categoryFilterMobile','petTypeFilter','petTypeFilterMobile',
     'brandFilter','brandFilterMobile','sortFilter','sortFilterMobile'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    initPriceRange(globalPriceMin, globalPriceMax);
    closeAllDropdowns();
    applyFilters();
}

function updateFilterCount() {
    const priceActive = priceMin > globalPriceMin || priceMax < globalPriceMax;
    const activeFilters = ['categoryFilter','petTypeFilter','brandFilter','sortFilter']
        .map(id => document.getElementById(id).value).filter(Boolean).length + (priceActive ? 1 : 0);
    const filterCount = document.getElementById('filterCount');
    if (activeFilters > 0) { filterCount.textContent = activeFilters; filterCount.style.display = 'inline-block'; }
    else { filterCount.style.display = 'none'; }
}

function syncURL(search, category, petType, brand, sort) {
    const params = new URLSearchParams();
    if (search)   params.set('q', search);
    if (category) params.set('category', category);
    if (petType)  params.set('pet', petType);
    if (brand)    params.set('brand', brand);
    if (sort)     params.set('sort', sort);
    if (priceMin > globalPriceMin) params.set('pmin', priceMin);
    if (priceMax < globalPriceMax) params.set('pmax', priceMax);
    history.replaceState(null, '', params.toString()
        ? `${location.pathname}?${params.toString()}`
        : location.pathname);
}

// UI MISC
function setupFilterToggle() {
    const toggleBtn = document.getElementById('filterToggleBtn');
    const sidebar   = document.getElementById('filtersSidebarMobile');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            const isOpen = sidebar.classList.toggle('mobile-hidden') === false;
            toggleBtn.setAttribute('aria-expanded', isOpen);
        });
    }
}

function setupScrollBehavior() {
    const searchBarTop     = document.getElementById('searchBarTop');
    const searchBarSidebar = document.getElementById('searchBarSidebar');
    if (!searchBarTop || !searchBarSidebar) return;
    const observer = new IntersectionObserver(([entry]) => {
        searchBarSidebar.classList.toggle('search-bar-sidebar--visible', !entry.isIntersecting);
    }, { threshold: 0, rootMargin: '-10px 0px 0px 0px' });
    observer.observe(searchBarTop);
}

// Scroll-to-top button — solo mobile
(function() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', function() {
        if (window.innerWidth < 768) {
            btn.classList.toggle('scroll-top-btn--visible', window.scrollY > 400);
        } else {
            btn.classList.remove('scroll-top-btn--visible');
        }
    }, { passive: true });
})();