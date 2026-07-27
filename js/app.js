/* =========================================================================
   NÉSTOR PIZZAS PWA — LÓGICA DE APLICACIÓN
   v20260726 | Modular, sin código monolítico
   ========================================================================= */

'use strict';

let currentCategory = 'TODOS';
let activeModalProduct = null;
let cart = [];
let currentSlide = 1;

// -------------------------------------------------------------------------
// RENDER: Tarjeta de Ingredientes Oficiales (aparece ANTES de las pizzas)
// -------------------------------------------------------------------------
function renderIngredientsCard() {
    return `
    <div class="col-span-full mb-4">
        <div class="relative overflow-hidden rounded-3xl border border-green-500/30 bg-gradient-to-br from-[#0D0D12] via-[#111118] to-[#0A0A0E] shadow-2xl p-6 sm:p-8">
            <!-- Glow decorativo -->
            <div class="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-green-500/5 blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-500/5 blur-3xl pointer-events-none"></div>

            <div class="relative z-10 space-y-5">
                <!-- Título sutil -->
                <div class="flex items-center gap-3">
                    <div class="w-1 h-8 rounded-full bg-green-500"></div>
                    <div>
                        <span class="text-[10px] font-mono font-bold text-green-400 uppercase tracking-widest">NUESTROS INGREDIENTES</span>
                        <p class="text-white font-display font-black text-base sm:text-lg uppercase tracking-wide leading-none mt-0.5">Carta oficial de toppings disponibles</p>
                    </div>
                </div>

                <!-- Grid de ingredientes (chips elegantes) -->
                <div class="flex flex-wrap gap-2">
                    ${NESTOR_INGREDIENTS_OFICIAL.map(ing => `
                        <span class="inline-flex items-center gap-1.5 bg-[#1A1A24] border border-zinc-700/70 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-green-500/50 hover:text-white transition-colors cursor-default">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-400/80 shrink-0"></span>
                            ${ing}
                        </span>
                    `).join('')}
                </div>

                <p class="text-[11px] text-zinc-500 font-medium">
                    Disponibles para pizzas al gusto y Mazzi Pizzas — pregunta disponibilidad de extras
                </p>
            </div>
        </div>
    </div>`;
}

// -------------------------------------------------------------------------
// RENDER: Encabezado de sección de categoría (idéntico al flyer)
// -------------------------------------------------------------------------
function renderCategoryHeader(cat, count) {
    const subtitleHtml = cat.subtitle
        ? `<span class="text-green-400 font-mono text-sm font-bold">${cat.subtitle}</span>`
        : '';

    return `
    <div class="col-span-full py-10 my-2 text-center space-y-2">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 mb-2">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            <span class="text-green-400 font-mono font-bold text-[11px] uppercase tracking-widest">${count} VARIEDADES</span>
        </div>
        <div class="flex items-center justify-center gap-3">
            <h2 class="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-none">
                ${cat.name}
            </h2>
            ${subtitleHtml}
        </div>
        <p class="text-sm text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed pt-1">${cat.desc}</p>
        <div class="w-16 h-0.5 bg-green-500/50 mx-auto mt-4 rounded-full"></div>
    </div>`;
}

// -------------------------------------------------------------------------
// RENDER: Tarjeta individual de producto
// -------------------------------------------------------------------------
function renderProductCard(product) {
    const fallback = `data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='540' viewBox='0 0 800 540'><rect width='800' height='540' fill='%23111118'/><text x='400' y='250' font-size='28' font-family='sans-serif' font-weight='800' fill='%2316A34A' text-anchor='middle' dominant-baseline='middle'>NESTOR PIZZAS</text><text x='400' y='310' font-size='18' font-family='sans-serif' fill='%23999' text-anchor='middle'>${encodeURIComponent(product.name)}</text></svg>`;

    return `
    <div class="group relative bg-[#111118] rounded-3xl border-2 border-zinc-800 hover:border-green-500/60 overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300 flex flex-col">

        <!-- Imagen -->
        <div class="relative h-52 sm:h-56 overflow-hidden bg-black shrink-0">
            <img
                src="${product.img}"
                onerror="this.onerror=null;this.src='${fallback}'"
                alt="${product.name}"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy">
            <!-- Gradiente oscuro inferior -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#111118] via-transparent to-transparent opacity-80 pointer-events-none"></div>

            <!-- Badge — fondo negro sólido, borde verde, texto blanco -->
            <span class="absolute top-3 left-3 z-20 bg-black border-2 border-green-500 text-white font-display font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-2xl leading-none">
                ${product.badge}
            </span>

            <!-- Precio -->
            <span class="absolute bottom-3 right-3 z-20 bg-black border-2 border-green-500/70 text-white font-display font-black text-lg sm:text-xl px-4 py-1.5 rounded-xl shadow-2xl leading-none">
                ${product.price.toFixed(2).replace('.', ',')} €
            </span>
        </div>

        <!-- Textos -->
        <div class="p-5 flex flex-col flex-1 gap-3">
            <div class="flex-1">
                <h3 class="font-display font-black text-lg sm:text-xl text-white uppercase tracking-wide leading-tight group-hover:text-green-400 transition-colors">
                    ${product.name}
                </h3>
                <p class="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed font-medium line-clamp-2">
                    ${product.desc}
                </p>
            </div>

            <!-- Botón de pedido -->
            <button
                onclick="openCustomizationModal(${product.id})"
                class="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-green-600 hover:to-green-700 text-white font-display font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-[0_10px_25px_-5px_rgba(22,163,74,0.4)] flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                PEDIR AHORA
            </button>
        </div>
    </div>`;
}

// -------------------------------------------------------------------------
// RENDER PRINCIPAL: Todo el catálogo
// -------------------------------------------------------------------------
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const categoriesToRender = currentCategory === 'TODOS'
        ? NESTOR_CATEGORIES
        : NESTOR_CATEGORIES.filter(c => c.id === currentCategory);

    let html = '';
    let isFirst = true;

    categoriesToRender.forEach(cat => {
        const catProducts = NESTOR_PRODUCTS.filter(p => p.category === cat.id);
        if (catProducts.length === 0) return;

        // Tarjeta de ingredientes ANTES de la primera sección (solo en vista TODOS o en NUESTRAS PIZZAS)
        if (isFirst && (currentCategory === 'TODOS' || currentCategory === 'NUESTRAS PIZZAS')) {
            html += renderIngredientsCard();
        }
        isFirst = false;

        // Encabezado de sección (exacto del flyer)
        html += renderCategoryHeader(cat, catProducts.length);

        // Tarjetas de producto
        catProducts.forEach(product => {
            html += renderProductCard(product);
        });
    });

    grid.innerHTML = html;
}

// -------------------------------------------------------------------------
// FILTRADO DE CATEGORÍAS
// -------------------------------------------------------------------------
function filterCategory(cat) {
    currentCategory = cat;

    document.querySelectorAll('.category-pill').forEach(pill => {
        const isActive = pill.id === `cat-${cat}`;
        pill.className = isActive
            ? 'category-pill active px-6 py-3 rounded-2xl bg-green-500 text-white font-extrabold border border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)] text-xs sm:text-sm whitespace-nowrap shrink-0'
            : 'category-pill px-6 py-3 rounded-2xl bg-[#14141E] text-gray-300 hover:text-white border border-zinc-700 hover:border-green-400 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all';
    });

    renderProducts();
    window.scrollTo({ top: 480, behavior: 'smooth' });
}

// -------------------------------------------------------------------------
// MODAL DE PERSONALIZACIÓN
// -------------------------------------------------------------------------
function openCustomizationModal(id) {
    window.app.pushModalState();
    const product = NESTOR_PRODUCTS.find(p => p.id === id);
    if (!product) return;
    activeModalProduct = product;

    const titleEl = document.getElementById('modal-product-title');
    const descEl = document.getElementById('modal-product-desc');
    const modal = document.getElementById('customization-modal');

    if (titleEl) titleEl.innerText = product.name;
    if (descEl) descEl.innerText = product.desc;
    if (modal) modal.classList.remove('hidden');
    updateModalPrice();
}

function closeCustomizationModal() {
    if(window.app && window.app.popModalState) window.app.popModalState();
    const modal = document.getElementById('customization-modal');
    if (modal) modal.classList.add('hidden');
    activeModalProduct = null;
}

function updateModalPrice() {
    if (!activeModalProduct) return;
    let total = activeModalProduct.price;
    document.querySelectorAll('.cust-extra:checked').forEach(cb => {
        total += parseFloat(cb.getAttribute('data-price') || 0);
    });
    const priceEl = document.getElementById('modal-total-price');
    if (priceEl) priceEl.innerText = `${total.toFixed(2).replace('.', ',')} €`;
}

function confirmCustomizedItem() {
    if (!activeModalProduct) return;
    const extras = [];
    document.querySelectorAll('.cust-extra:checked').forEach(cb => {
        extras.push(cb.getAttribute('data-name'));
    });
    const finalPrice = parseFloat((document.getElementById('modal-total-price')?.innerText || '0').replace(',', '.'));
    cart.push({ id: Date.now(), name: activeModalProduct.name, extras, price: finalPrice });
    closeCustomizationModal();
    updateCartStickyBar();
    showOrderToast(`${activeModalProduct.name} añadido a tu comanda (${finalPrice.toFixed(2).replace('.', ',')} €)`);
}

// -------------------------------------------------------------------------
// CARRITO Y BARRA FLOTANTE
// -------------------------------------------------------------------------
function updateCartStickyBar() {
    const bar = document.getElementById('sticky-cart-bar');
    const badge = document.getElementById('cart-counter-badge');
    const total = document.getElementById('cart-total-badge');
    if (!bar) return;

    if (cart.length > 0) {
        bar.classList.remove('hidden');
        if (badge) badge.innerText = cart.length;
        const sum = cart.reduce((a, c) => a + c.price, 0);
        if (total) total.innerText = `${sum.toFixed(2).replace('.', ',')} €`;
    } else {
        bar.classList.add('hidden');
    }
}

function openCheckoutModal() {
    window.app.pushModalState();
    renderCheckoutItems();
    updateCheckoutTotals();
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeCheckoutModal() {
    if(window.app && window.app.popModalState) window.app.popModalState();
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
}

function renderCheckoutItems() {
    const list = document.getElementById('checkout-items-list');
    if (!list) return;
    if (cart.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-400 py-8 font-medium">Tu comanda está vacía.</p>`;
        return;
    }
    list.innerHTML = cart.map((item, idx) => `
        <div class="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800 gap-3">
            <div>
                <h4 class="font-display font-bold text-white text-sm uppercase">${item.name}</h4>
                ${item.extras?.length ? `<p class="text-xs text-green-400">${item.extras.join(', ')}</p>` : ''}
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="font-display font-black text-white">${item.price.toFixed(2).replace('.', ',')} €</span>
                <button onclick="removeFromCart(${idx})" class="text-red-400 hover:text-white text-xs bg-red-950/60 border border-red-800 rounded-lg px-2 py-1 font-bold">✕</button>
            </div>
        </div>
    `).join('');
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    renderCheckoutItems();
    updateCheckoutTotals();
    updateCartStickyBar();
}

function updateCheckoutTotals() {
    const subtotal = cart.reduce((a, c) => a + c.price, 0);
    const el = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');
    const finalEl = document.getElementById('checkout-final-total');
    if (el) el.innerText = `${subtotal.toFixed(2).replace('.', ',')} €`;
    if (totalEl) totalEl.innerText = `${subtotal.toFixed(2).replace('.', ',')} €`;
    if (finalEl) finalEl.innerText = `${subtotal.toFixed(2).replace('.', ',')} €`;
}

// -------------------------------------------------------------------------
// TOAST DE NOTIFICACIÓN
// -------------------------------------------------------------------------
function showOrderToast(msg) {
    let toast = document.getElementById('order-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'order-toast';
        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900 border-2 border-green-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-display font-bold text-sm max-w-sm w-full mx-4';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <span class="text-green-400 text-lg shrink-0">✓</span>
        <span class="flex-1 text-xs">${msg}</span>
        <button onclick="openCheckoutModal()" class="bg-green-500 text-white px-3 py-1.5 rounded-xl text-[10px] uppercase font-black shrink-0">Ver →</button>
    `;
    toast.style.display = 'flex';
    setTimeout(() => { if (toast) toast.remove(); }, 4000);
}

// -------------------------------------------------------------------------
// VIP MODAL
// -------------------------------------------------------------------------
function openVipModal() {
    window.app.pushModalState();
    const modal = document.getElementById('vip-modal');
    if (modal) modal.classList.remove('hidden');
}
function closeVipModal() {
    if(window.app && window.app.popModalState) window.app.popModalState();
    const modal = document.getElementById('vip-modal');
    if (modal) modal.classList.add('hidden');
}
function enterRaffle(e) {
    if (e) e.preventDefault();
    const confirm = document.getElementById('raffle-confirmation');
    if (confirm) confirm.classList.remove('hidden');
}

// -------------------------------------------------------------------------
// UPSELL
// -------------------------------------------------------------------------
function openDynamicUpsellModal() {
    window.app.pushModalState();
    renderDynamicUpsells();
    const modal = document.getElementById('upsell-modal');
    if (modal) modal.classList.remove('hidden');
}
function closeUpsellAndReturnToMenu() {
    if(window.app && window.app.popModalState) window.app.popModalState();
    const modal = document.getElementById('upsell-modal');
    if (modal) modal.classList.add('hidden');
}
function closeUpsellAndGoToCheckout() {
    const modal = document.getElementById('upsell-modal');
    if (modal) modal.classList.add('hidden');
    openCheckoutModal();
}
function renderDynamicUpsells() {
    const container = document.getElementById('upsell-cards-container');
    if (!container || !NESTOR_UPSELLS) return;
    
    let html = '';
    
    NESTOR_UPSELLS.forEach(group => {
        html += `
            <div class="mb-4 sm:mb-6 last:mb-0">
                <h3 class="text-[10px] sm:text-xs text-nestor-green font-display font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-nestor-terracotta rounded-full"></span>
                    ${group.category}
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    ${group.items.map(up => `
                        <div class="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors gap-3">
                            <div class="flex-1 min-w-0">
                                <h4 class="font-display font-bold text-white text-xs uppercase truncate">${up.name}</h4>
                                <p class="text-[10px] text-zinc-400 truncate">${up.desc}</p>
                                <span class="text-amber-400 font-display font-black text-xs">+${up.price.toFixed(2).replace('.', ',')} €</span>
                            </div>
                            <button onclick="addUpsellDirectly('${up.name}', ${up.price}, this)" class="bg-zinc-800 hover:bg-green-500 text-white font-bold px-3 py-2 rounded-xl text-xs uppercase transition-all shrink-0">
                                + Añadir
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
function addUpsellDirectly(name, price, btn) {
    cart.push({ id: Date.now(), name, extras: [], price });
    updateCartStickyBar();
    if (btn) { btn.innerText = '✓'; btn.className = 'bg-green-500 text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0'; }
}

// -------------------------------------------------------------------------
// PROCESO DE PEDIDO
// -------------------------------------------------------------------------
function processAndPrintOrder() {
    if (cart.length === 0) return;
    
    // Mostrar modal o toast de "En construcción" (Evitar saltos a WhatsApp reales en la demo)
    const toastMsg = '🚧 Módulo de pagos y envío de pedidos en construcción (Demo Visual).';
    showOrderToast(toastMsg);
    
    // Cerrar el modal para que no se quede atascado
    setTimeout(() => {
        closeCheckoutModal();
    }, 1500);
}

// -------------------------------------------------------------------------
// CARRUSEL HERO
// -------------------------------------------------------------------------
function changeSlide(num) {
    currentSlide = num;
    const s1 = document.getElementById('slide-1');
    const s2 = document.getElementById('slide-2');
    const d1 = document.getElementById('dot-1');
    const d2 = document.getElementById('dot-2');

    if (num === 1) {
        if (s1) { s1.classList.remove('hidden'); s1.style.opacity = '1'; s1.style.pointerEvents = 'auto'; }
        if (s2) { s2.classList.add('hidden'); s2.style.opacity = '0'; s2.style.pointerEvents = 'none'; }
        if (d1) d1.className = 'w-8 h-2 rounded-full bg-green-500 transition-all';
        if (d2) d2.className = 'w-2.5 h-2 rounded-full bg-zinc-600 transition-all';
    } else {
        if (s1) { s1.classList.add('hidden'); s1.style.opacity = '0'; s1.style.pointerEvents = 'none'; }
        if (s2) { s2.classList.remove('hidden'); s2.style.opacity = '1'; s2.style.pointerEvents = 'auto'; }
        if (d1) d1.className = 'w-2.5 h-2 rounded-full bg-zinc-600 transition-all';
        if (d2) d2.className = 'w-8 h-2 rounded-full bg-green-500 transition-all';
    }
}

function nextSlide() { changeSlide(currentSlide === 1 ? 2 : 1); }
setInterval(nextSlide, 7000);

// -------------------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------------------
function init() {
    renderProducts();
    // Mostrar barra de instalación PWA si procede
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window._deferredPWAPrompt = e;
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.remove('hidden');
        banner.classList.add('flex');
    });
}

// (PWA install logic moved to the bottom section)

// Ejecutar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('[SW] Registrado:', reg.scope);
                reg.update();
            })
            .catch(err => console.warn('[SW] Error:', err));
    });
}


// =========================================================================
// SPLASH SCREEN & PWA LIFECYCLE
// =========================================================================
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        // Simular tiempo de carga del motor (1.5s)
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 700); // Wait for transition
        }, 1500);
    }
});

// =========================================================================
// USER MODAL LOGIC (Auth, Registration, Points)
// =========================================================================
window.app = window.app || {};

window.app.openUserModal = function() {
    window.app.pushModalState();
    const overlay = document.getElementById('user-modal-overlay');
    const content = document.getElementById('user-modal-content');
    if(overlay && content) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.remove('scale-95', 'opacity-0');
        
        // Reset view to login if not logged in
        if (!localStorage.getItem('nestor_logged_in')) {
            window.app.switchModalView('login');
        } else {
            window.app.switchModalView('profile');
        }
    }
};

window.app.closeUserModal = function() {
    if(window.app && window.app.popModalState) window.app.popModalState();
    const overlay = document.getElementById('user-modal-overlay');
    const content = document.getElementById('user-modal-content');
    if(overlay && content) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        content.classList.add('scale-95', 'opacity-0');
    }
};


window.app.simulateLogin = function() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error-msg');
    
    if (email === 'admin' && pass === 'admin') {
        if(errorMsg) errorMsg.classList.add('hidden');
        currentUser = {
            name: 'Néstor Admin VIP',
            points: 1250,
            phone: '679 76 19 87',
            address: 'Calle Alcalde Felip, 9'
        };
        localStorage.setItem('nestor_logged_in', 'true');
        window.app.updateHeaderAuth();
        window.app.switchModalView('profile');
    } else {
        if(errorMsg) {
            errorMsg.classList.remove('hidden');
            const content = document.getElementById('user-modal-content');
            if(content) {
                content.classList.add('animate-[shake_0.5s_ease-in-out]');
                setTimeout(() => content.classList.remove('animate-[shake_0.5s_ease-in-out]'), 500);
            }
        }
    }
};

window.app.simulateLogout = function() {
    currentUser = null;
    localStorage.removeItem('nestor_logged_in');
    window.app.updateHeaderAuth();
    window.app.switchModalView('login');
};



// =========================================================================
// TICKER TIMER LOGIC (MARKETING AGRESIVO)
// =========================================================================
function updateTickerTimer() {
    const now = new Date();
    // Simulate a countdown ending at midnight
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const diff = end - now;
    if(diff < 0) return;
    
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    for(let i = 1; i <= 3; i++) {
        const el = document.getElementById(i === 1 ? 'ticker-timer' : 'ticker-timer-' + i);
        if(el) el.textContent = timeStr;
    }
}
setInterval(updateTickerTimer, 1000);
updateTickerTimer();





// =========================================================================
// UNIVERSAL PWA INSTALLATION LOGIC
// =========================================================================
let deferredPrompt;

// Wait for DOM to check standalone mode
document.addEventListener('DOMContentLoaded', () => {
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
    if (isInStandaloneMode()) {
        const btn1 = document.getElementById('nav-install-btn');
        const btn2 = document.getElementById('mobile-install-btn');
        if(btn1) btn1.style.display = 'none';
        if(btn2) btn2.style.display = 'none';
    }
});

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default prompt
    e.preventDefault();
    deferredPrompt = e;
});

window.installPWA = async function() {
    // iOS Safari workaround check
    const isIos = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    }
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIos() && !isInStandaloneMode()) {
        alert("Para instalar en iOS:\nToca el botón 'Compartir' (el cuadrado con la flecha hacia arriba) y selecciona 'Añadir a la pantalla de inicio'.");
        return;
    }

    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
            const btn1 = document.getElementById('nav-install-btn');
            const btn2 = document.getElementById('mobile-install-btn');
            if(btn1) btn1.style.display = 'none';
            if(btn2) btn2.style.display = 'none';
        }
        deferredPrompt = null;
    } else {
        alert("La aplicación ya está instalada o tu navegador no soporta instalaciones automáticas. Intenta instalar desde el menú de opciones de tu navegador.");
    }
};

window.addEventListener('appinstalled', (evt) => {
    const btn1 = document.getElementById('nav-install-btn');
    const btn2 = document.getElementById('mobile-install-btn');
    if(btn1) btn1.style.display = 'none';
    if(btn2) btn2.style.display = 'none';
    deferredPrompt = null;
});


// =========================================================================
// USER AUTHENTICATION & MODAL LOGIC (MOCK)
// =========================================================================
let currentUser = null; // null if not logged in

window.app = window.app || {};

window.app.openUserModal = function() {
    const overlay = document.getElementById('user-modal-overlay');
    const content = document.getElementById('user-modal-content');
    
    // Set correct view before opening
    if(currentUser) {
        window.app.switchModalView('profile');
    } else {
        window.app.switchModalView('login');
    }
    
    overlay.classList.remove('pointer-events-none');
    overlay.classList.replace('opacity-0', 'opacity-100');
    content.classList.replace('scale-95', 'scale-100');
    content.classList.replace('opacity-0', 'opacity-100');
};

window.app.closeUserModal = function() {
    const overlay = document.getElementById('user-modal-overlay');
    const content = document.getElementById('user-modal-content');
    
    overlay.classList.add('pointer-events-none');
    overlay.classList.replace('opacity-100', 'opacity-0');
    content.classList.replace('scale-100', 'scale-95');
    content.classList.replace('opacity-100', 'opacity-0');
};


window.app.simulateLogin = function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error-msg');
    
    if(email === 'admin' && pass === 'admin') {
        // Success
        if (errorMsg) errorMsg.classList.add('hidden');
        currentUser = {
            name: 'Administrador',
            points: 0,
            phone: '679 00 00 00',
            address: 'Calle Falsa 123, 1ºA, Caniles'
        };
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        window.app.updateHeaderAuth();
        window.app.switchModalView('profile');
    } else {
        // Error
        if (errorMsg) {
            errorMsg.classList.remove('hidden');
            // Shake effect
            const content = document.getElementById('user-modal-content');
            content.classList.add('animate-[shake_0.5s_ease-in-out]');
            setTimeout(() => content.classList.remove('animate-[shake_0.5s_ease-in-out]'), 500);
        }
    }
};

window.app.simulateRegister = function() {
    const name = document.getElementById('reg-name').value;
    if(!name) { alert('Introduce tu nombre'); return; }
    
    currentUser = {
        name: name,
        points: 0
    };
    
    window.app.updateHeaderAuth();
    window.app.switchModalView('profile');
};

window.app.simulateLogout = function() {
    currentUser = null;
    window.app.updateHeaderAuth();
    window.app.closeUserModal();
};

window.app.updateHeaderAuth = function() {
    const icon = document.getElementById('header-auth-icon');
    const text = document.getElementById('header-auth-text');
    
    // Also update points inside checkout if visible
    const chkPts = document.getElementById('chk-pts');
    const btnRedeem = document.getElementById('btn-redeem-pts');
    
    if(currentUser) {
        icon.textContent = 'VIP';
        text.innerHTML = `<span class="text-green-400 font-display font-extrabold">${currentUser.points}</span> pts`;
        text.className = "text-sm font-bold text-white"; // show on mobile when logged in
        
        if(chkPts) chkPts.textContent = currentUser.points;
        if(btnRedeem) {
            if(currentUser.points >= 100) {
                btnRedeem.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                btnRedeem.classList.add('opacity-50', 'pointer-events-none');
            }
        }
    } else {
        icon.textContent = '🔑';
        text.textContent = 'INICIAR SESIÓN';
        text.className = "hidden sm:inline text-sm font-bold text-white"; // hide text on mobile when logged out
        
        if(chkPts) chkPts.textContent = '0';
        if(btnRedeem) btnRedeem.classList.add('opacity-50', 'pointer-events-none');
    }
};

// Initialize auth header on load
document.addEventListener('DOMContentLoaded', () => {
    window.app.updateHeaderAuth();
});


window.app.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-eye');
    if(input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
    }
};


window.app.switchModalView = function(viewName) {
    const errorMsg = document.getElementById('login-error-msg');
    if (errorMsg) errorMsg.classList.add('hidden');

    const views = ['login', 'register', 'profile', 'legal', 'legal-doc', 'delete-account', 'delete-success'];
    views.forEach(v => {
        const el = document.getElementById('view-' + v);
        if(el) {
            if(v === viewName) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    const title = document.getElementById('user-modal-title');
    const subtitle = document.getElementById('user-modal-subtitle');
    
    if(viewName === 'login') {
        if(title) title.textContent = 'MI CUENTA';
        if(subtitle) subtitle.textContent = 'Inicia sesión para acumular puntos';
    } else if(viewName === 'register') {
        if(title) title.textContent = 'CREAR CUENTA';
        if(subtitle) subtitle.textContent = 'Únete al club VIP de Néstor';
    } else if(viewName === 'profile') {
        if(title) title.textContent = 'PERFIL VIP';
        if(subtitle) subtitle.textContent = 'Gestiona tu fidelización';
        if(currentUser) {
            document.getElementById('profile-name').textContent = currentUser.name;
            document.getElementById('profile-points').textContent = currentUser.points;
            document.getElementById('profile-phone').textContent = currentUser.phone || 'No registrado';
            document.getElementById('profile-address').textContent = currentUser.address || 'No registrada';
            
            // Logic for rewards buttons
            const btn100 = document.getElementById('btn-reward-100');
            const btn250 = document.getElementById('btn-reward-250');
            
            if(currentUser.points >= 100) {
                btn100.className = 'text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all bg-nestor-green hover:bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]';
                btn100.textContent = 'Canjear';
                btn100.disabled = false;
            } else {
                btn100.className = 'text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all bg-gray-700 text-gray-400 cursor-not-allowed';
                btn100.textContent = 'Bloqueado';
                btn100.disabled = true;
            }
            
            if(currentUser.points >= 250) {
                btn250.className = 'text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all bg-nestor-gold hover:bg-yellow-500 text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]';
                btn250.textContent = 'Canjear';
                btn250.disabled = false;
            } else {
                btn250.className = 'text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all bg-gray-700 text-gray-400 cursor-not-allowed';
                btn250.textContent = 'Bloqueado';
                btn250.disabled = true;
            }
        }
    } else if(viewName === 'legal' || viewName === 'legal-doc' || viewName === 'delete-account' || viewName === 'delete-success') {
        if(title) title.textContent = 'CENTRO LEGAL';
        if(subtitle) subtitle.textContent = 'Transparencia y Normativas';
    }
    
    // Hide footer link in legal views
    const legalFooter = document.getElementById('legal-footer-link');
    if(legalFooter) {
        if(['legal', 'legal-doc', 'delete-account', 'delete-success'].includes(viewName)) {
            legalFooter.classList.add('hidden');
        } else {
            legalFooter.classList.remove('hidden');
        }
    }
};

window.app.openLegalDoc = function(title) {
    const titleEl = document.getElementById('legal-doc-title');
    if(titleEl) titleEl.textContent = title;
    window.app.switchModalView('legal-doc');
};


window.app = window.app || {};
window.app.isModalOpen = false;

window.app.pushModalState = function() {
    if (!window.app.isModalOpen) {
        history.pushState({ modal: true }, '');
        window.app.isModalOpen = true;
    }
};

window.app.popModalState = function() {
    if (window.app.isModalOpen) {
        window.app.isModalOpen = false;
        history.back();
    }
};

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.addEventListener('popstate', (e) => {
    window.app.isModalOpen = false;
    
    const m1 = document.getElementById('product-modal-overlay');
    if(m1) m1.classList.add('hidden');
    
    const m2 = document.getElementById('customization-modal');
    if(m2) m2.classList.add('hidden');
    
    const m3 = document.getElementById('checkout-modal');
    if(m3) m3.classList.add('hidden');
    
    const m4 = document.getElementById('vip-modal');
    if(m4) m4.classList.add('hidden');
    
    const up = document.getElementById('upsell-modal');
    if(up) up.classList.add('hidden');
    const up2 = document.getElementById('dynamic-upsell-modal');
    if(up2) up2.classList.add('hidden');
    
    const userModalOv = document.getElementById('user-modal-overlay');
    const userModalCo = document.getElementById('user-modal-content');
    if(userModalOv && userModalCo) {
        userModalOv.classList.add('opacity-0', 'pointer-events-none');
        userModalCo.classList.add('scale-95', 'opacity-0');
    }
});

// Forzar scroll arriba al cargar la app
window.addEventListener('load', () => {
    setTimeout(() => window.scrollTo(0, 0), 100);
});

// Lógica del botón Scroll to Top
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scroll-to-top-btn');
    if(btn) {
        if(window.scrollY > 300) {
            btn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        } else {
            btn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        }
    }
});


window.app.processAccountDeletion = function() {
    const reason = document.getElementById('delete-reason').value;
    if(!reason) {
        alert('Por favor, selecciona un motivo.');
        return;
    }
    // Simulate sending email to support
    console.log('Enviando solicitud de baja a soporte@nestorpizzas.com por motivo:', reason);
    window.app.switchModalView('delete-success');
};
