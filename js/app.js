/* =========================================================================
   NÉSTOR PIZZAS PWA - LÓGICA DE APLICACIÓN COMPLETA (ESTRUCTURA MODULAR)
   ========================================================================= */

let currentCategory = 'TODOS';
let activeModalProduct = null;
let cart = [];
let currentSlide = 1;

// 1. Renderizado de Catálogo por Secciones Categorizadas (4 Tarjetas por Fila en PC)
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const categoriesToRender = currentCategory === 'TODOS'
        ? NESTOR_CATEGORIES
        : NESTOR_CATEGORIES.filter(c => c.id === currentCategory);

    let html = '';

    categoriesToRender.forEach(cat => {
        const catProducts = NESTOR_PRODUCTS.filter(p => p.category === cat.id);
        if (catProducts.length === 0) return;

        // Encabezado de Sección Categorizada Profesional
        html += `
        <div class="col-span-full border-b border-zinc-800/80 pb-3 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center font-bold text-xl shrink-0">
                    ${cat.icon}
                </div>
                <div>
                    <h2 class="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-tight flex items-center gap-2">
                        <span>${cat.name}</span>
                    </h2>
                    <p class="text-xs text-gray-400 font-medium">${cat.desc}</p>
                </div>
            </div>
            <span class="text-xs font-mono font-bold bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/30 self-start sm:self-auto">
                ${catProducts.length} Variedades
            </span>
        </div>
        `;

        // Renderizado de Tarjetas de Producto
        catProducts.forEach(product => {
            const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='540' viewBox='0 0 800 540'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23F8F6F2'/><stop offset='100%' stop-color='%23E4E4E7'/></linearGradient></defs><rect width='800' height='540' fill='url(%23g)'/><circle cx='400' cy='230' r='110' stroke='%2316A34A' stroke-width='4' fill='none'/><text x='400' y='238' font-size='32' font-family='sans-serif' font-weight='800' fill='%2318181B' text-anchor='middle'>NÉSTOR PIZZAS</text><text x='400' y='380' font-size='26' font-family='sans-serif' font-weight='800' fill='%23EA580C' text-anchor='middle'>${product.name.replace(/&/g, 'y')}</text><text x='400' y='425' font-size='16' font-family='sans-serif' font-weight='600' fill='%2371717A' text-anchor='middle'>CANILES Y BAZA • ESPAÑA</text></svg>`;

            html += `
            <div class="card-curved overflow-hidden shadow-2xl flex flex-col justify-between group relative bg-[#14141E] rounded-3xl border-2 border-green-500/40 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.35)] transition-all">
                <div>
                    <!-- Foto de Producto -->
                    <div class="relative h-56 sm:h-60 overflow-hidden bg-black">
                        <img src="${product.img}" 
                             onerror="this.onerror=null; this.src='${fallbackSvg}'"
                             alt="${product.name}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                        <div class="absolute inset-0 bg-gradient-to-t from-[#14141E] via-transparent to-transparent opacity-90"></div>
                        
                        <!-- Insignia Personalizada Específica -->
                        <span class="absolute top-3 left-3 ${product.badgeClass || 'bg-green-500/20 text-green-400 border border-green-500/40'} text-[10px] font-display font-extrabold uppercase px-3 py-1 rounded-xl shadow-lg tracking-wider backdrop-blur-md">
                            ${product.badge}
                        </span>

                        <span class="absolute bottom-3 right-3 bg-black/90 text-white font-display font-black text-lg px-3.5 py-1 rounded-xl shadow-2xl border border-green-500/50 backdrop-blur-md">
                            ${product.price.toFixed(2)} €
                        </span>
                    </div>

                    <!-- Textos en Blanco Puro -->
                    <div class="p-5 space-y-1.5">
                        <h3 class="font-display font-black text-lg sm:text-xl text-white leading-tight group-hover:text-green-400 transition-colors uppercase tracking-wide drop-shadow-sm">${product.name}</h3>
                        <p class="text-xs text-gray-300 leading-relaxed font-medium line-clamp-2">${product.desc}</p>
                    </div>
                </div>

                <!-- Botón de Pedido -->
                <div class="p-5 pt-0 mt-2">
                    <button onclick="openCustomizationModal(${product.id})" class="w-full bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-green-600 hover:to-green-700 text-white font-display font-black py-3.5 rounded-2xl transition-all shadow-lg uppercase tracking-wider text-xs flex items-center justify-center gap-2 group-hover:shadow-[0_15px_30px_-5px_rgba(255,59,0,0.4)]">
                        <span>+ PEDIR AHORA</span>
                    </button>
                </div>
            </div>
            `;
        });
    });

    grid.innerHTML = html;
}

// 2. Filtrado de Categoría con Píldoras en Modo Oscuro
function filterCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.category-pill').forEach(pill => {
        if (pill.id === `cat-${cat}`) {
            pill.className = 'category-pill active px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-green-500 text-white font-extrabold border border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]';
        } else {
            pill.className = 'category-pill px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-[#14141E] text-gray-300 hover:text-white border border-zinc-700 hover:border-green-400';
        }
    });
    renderProducts();
}

// 3. Modales de Personalización
function openCustomizationModal(id) {
    const product = NESTOR_PRODUCTS.find(p => p.id === id);
    if (!product) return;
    activeModalProduct = product;

    document.getElementById('modal-product-title').innerText = product.name;
    document.getElementById('modal-product-desc').innerText = product.desc;
    document.getElementById('customization-modal').classList.remove('hidden');
    updateModalPrice();
}

function closeCustomizationModal() {
    const modal = document.getElementById('customization-modal');
    if (modal) modal.classList.add('hidden');
    activeModalProduct = null;
}

function updateModalPrice() {
    if (!activeModalProduct) return;
    let total = activeModalProduct.price;

    const sizeRadio = document.querySelector('input[name="cust-size"]:checked');
    if (sizeRadio && sizeRadio.value.includes('Extra Queso Mozzarella Gratinado')) {
        total += 2.00;
    }

    document.querySelectorAll('.cust-extra:checked').forEach(cb => {
        total += parseFloat(cb.getAttribute('data-price') || 0);
    });

    const priceEl = document.getElementById('modal-total-price');
    if (priceEl) priceEl.innerText = `${total.toFixed(2)} €`;
}

function selectCustSizeOption(labelEl) {
    document.querySelectorAll('.cust-size-btn').forEach(btn => {
        btn.className = 'cust-size-btn flex items-center justify-between p-4 rounded-2xl border border-zinc-700 bg-zinc-800 cursor-pointer hover:border-nestor-green transition-all';
    });
    labelEl.className = 'cust-size-btn flex items-center justify-between p-4 rounded-2xl border-2 border-nestor-green bg-nestor-green/15 cursor-pointer shadow-sm transition-all';
    const radio = labelEl.querySelector('input[type="radio"]');
    if (radio) {
        radio.checked = true;
        updateModalPrice(radio.value.includes('Extra Queso') ? 2.00 : 0);
    }
}

function toggleCheckboxCard(labelEl, isRemove = false) {
    const cb = labelEl.querySelector('input[type="checkbox"]');
    if (!cb) return;
    cb.checked = !cb.checked;
    if (isRemove) {
        labelEl.className = cb.checked 
            ? 'bg-red-500/20 text-red-400 px-3.5 py-2 rounded-xl border border-red-500 flex items-center gap-2 cursor-pointer font-bold shadow-sm transition-all'
            : 'bg-zinc-800/80 px-3.5 py-2 rounded-xl border border-zinc-700 flex items-center gap-2 cursor-pointer hover:border-red-500 transition-all';
    } else {
        labelEl.className = cb.checked 
            ? 'flex items-center justify-between p-3 rounded-xl bg-nestor-green/20 border-2 border-nestor-green text-white font-bold cursor-pointer transition-all shadow-sm'
            : 'flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 cursor-pointer hover:border-nestor-green transition-all';
        updateModalPrice();
    }
}

function confirmCustomizedItem() {
    if (!activeModalProduct) return;

    const sizeRadio = document.querySelector('input[name="cust-size"]:checked');
    const sizeVal = sizeRadio ? sizeRadio.value : 'Tamaño Estándar (33cm)';

    const extras = [];
    document.querySelectorAll('.cust-extra:checked').forEach(cb => {
        extras.push(`+ ${cb.getAttribute('data-name')}`);
    });

    const removes = [];
    document.querySelectorAll('.cust-remove:checked').forEach(cb => {
        removes.push(cb.value);
    });

    let finalPrice = parseFloat(document.getElementById('modal-total-price').innerText);

    cart.push({
        id: Date.now(),
        name: activeModalProduct.name,
        size: sizeVal,
        extras: extras,
        removes: removes,
        price: finalPrice
    });

    closeCustomizationModal();
    updateCartStickyBar();
    showOrderToast(`✓ ${activeModalProduct.name} se ha sumado a tu comanda (${finalPrice.toFixed(2)} €)`);
}

// 4. Upsell Dinámico y Recomendador Pre-Checkout
function openDynamicUpsellModal() {
    renderDynamicUpsells();
    const modal = document.getElementById('upsell-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeUpsellAndReturnToMenu() {
    const modal = document.getElementById('upsell-modal');
    if (modal) modal.classList.add('hidden');
}

function closeUpsellAndGoToCheckout() {
    closeUpsellAndReturnToMenu();
    openCheckoutModal();
}

function renderDynamicUpsells() {
    const container = document.getElementById('upsell-cards-container');
    if (!container) return;

    const shuffled = [...NESTOR_UPSELLS].sort(() => 0.5 - Math.random()).slice(0, 3);
    container.innerHTML = shuffled.map(up => `
        <div class="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-nestor-gold transition-all group">
            <div class="flex items-center gap-3">
                <img src="${up.img}" alt="${up.name}" class="w-14 h-14 rounded-xl object-cover shrink-0 border border-zinc-800">
                <div>
                    <h4 class="font-display font-bold text-white text-xs sm:text-sm uppercase">${up.name}</h4>
                    <p class="text-[10px] sm:text-[11px] text-zinc-400 line-clamp-1">${up.desc}</p>
                    <span class="text-nestor-gold font-display font-black text-xs mt-0.5 inline-block">+${up.price.toFixed(2)} €</span>
                </div>
            </div>
            <button onclick="addUpsellDirectly('${up.name}', ${up.price}, this)" class="bg-zinc-800 hover:bg-nestor-gold hover:text-black text-white font-display font-bold px-3 py-2 rounded-xl text-xs uppercase transition-all shrink-0 border border-zinc-700">
                + Añadir
            </button>
        </div>
    `).join('');
}

function addUpsellDirectly(name, price, btnEl) {
    cart.push({
        id: Date.now(),
        name: name,
        size: 'Complemento Sugerido',
        extras: [],
        removes: [],
        price: price
    });
    updateCartStickyBar();
    if (btnEl) {
        btnEl.innerText = '✓ Añadido';
        btnEl.className = 'bg-green-500 text-white font-display font-bold px-3 py-2 rounded-xl text-xs uppercase transition-all shrink-0 border border-green-400 shadow';
    }
}

// 5. Checkout & Carrito
function openCheckoutModal() {
    renderCheckoutItems();
    updateCheckoutTotals();
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
}

function renderCheckoutItems() {
    const list = document.getElementById('checkout-items-list');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8 space-y-2">
                <p class="text-gray-400 font-medium">Tu comanda está vacía actualmente.</p>
                <button onclick="closeCheckoutModal()" class="text-green-400 text-xs font-bold uppercase underline">Explorar carta de pizzas →</button>
            </div>
        `;
        return;
    }

    list.innerHTML = cart.map((item, idx) => `
        <div class="p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
            <div>
                <h4 class="font-display font-bold text-white text-xs sm:text-sm uppercase">${item.name}</h4>
                <p class="text-[10px] text-gray-400">${item.size}</p>
                ${item.extras.length ? `<p class="text-[10px] text-green-400">${item.extras.join(', ')}</p>` : ''}
                ${item.removes.length ? `<p class="text-[10px] text-red-400">${item.removes.join(', ')}</p>` : ''}
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="font-display font-black text-white text-sm">${item.price.toFixed(2)} €</span>
                <button onclick="removeFromCart(${idx})" class="text-red-400 hover:text-white p-1 text-xs font-bold bg-red-950/60 rounded-lg border border-red-800">✕</button>
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
    const subtotal = cart.reduce((acc, curr) => acc + curr.price, 0);
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    if (subtotalEl) subtotalEl.innerText = `${subtotal.toFixed(2)} €`;
    if (totalEl) totalEl.innerText = `${subtotal.toFixed(2)} €`;
}

// 6. Barra Flotante de Carrito
function updateCartStickyBar() {
    const bar = document.getElementById('sticky-cart-bar');
    const counterBadge = document.getElementById('cart-counter-badge');
    const totalBadge = document.getElementById('cart-total-badge');

    if (!bar || !counterBadge || !totalBadge) return;

    if (cart.length > 0) {
        bar.classList.remove('hidden');
        counterBadge.innerText = cart.length;
        const sum = cart.reduce((acc, curr) => acc + curr.price, 0);
        totalBadge.innerText = `${sum.toFixed(2)} €`;
    } else {
        bar.classList.add('hidden');
    }
}

// 7. Toast Notificación
function showOrderToast(msg) {
    let toast = document.getElementById('order-toast-banner');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'order-toast-banner';
        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border-2 border-green-500 text-white px-6 py-3.5 rounded-2xl shadow-[0_20px_40px_rgba(22,163,74,0.3)] flex items-center gap-4 font-display font-bold text-xs sm:text-sm transition-all duration-300 animate-bounce';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <span class="text-green-400 text-lg">★</span>
        <span>${msg}</span>
        <button onclick="openCheckoutModal()" class="bg-green-500 hover:bg-green-600 text-white px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow shrink-0">
            Ver Pedido →
        </button>
    `;
    setTimeout(() => {
        if (toast) toast.remove();
    }, 4500);
}

// 8. VIP & Sorteos
function openVipModal() {
    const modal = document.getElementById('vip-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeVipModal() {
    const modal = document.getElementById('vip-modal');
    if (modal) modal.classList.add('hidden');
}

function enterRaffle(e) {
    if (e) e.preventDefault();
    const box = document.getElementById('raffle-box');
    const confirm = document.getElementById('raffle-confirmation');
    if (box && confirm) {
        box.querySelector('form').classList.add('hidden');
        confirm.classList.remove('hidden');
    }
}

// 9. Control de Carrusel Hero
function changeSlide(num) {
    currentSlide = num;
    const slide1 = document.getElementById('slide-1');
    const slide2 = document.getElementById('slide-2');
    const dot1 = document.getElementById('dot-1');
    const dot2 = document.getElementById('dot-2');

    if (num === 1) {
        if (slide1) { slide1.classList.remove('hidden'); slide1.style.opacity = '1'; slide1.style.pointerEvents = 'auto'; }
        if (slide2) { slide2.classList.add('hidden'); slide2.style.opacity = '0'; slide2.style.pointerEvents = 'none'; }
        if (dot1) dot1.className = 'w-8 h-2 rounded-full bg-green-500 transition-all';
        if (dot2) dot2.className = 'w-2.5 h-2 rounded-full bg-zinc-600 transition-all';
    } else {
        if (slide1) { slide1.classList.add('hidden'); slide1.style.opacity = '0'; slide1.style.pointerEvents = 'none'; }
        if (slide2) { slide2.classList.remove('hidden'); slide2.style.opacity = '1'; slide2.style.pointerEvents = 'auto'; }
        if (dot1) dot1.className = 'w-2.5 h-2 rounded-full bg-zinc-600 transition-all';
        if (dot2) dot2.className = 'w-8 h-2 rounded-full bg-green-500 transition-all';
    }
}

function nextSlide() { 
    changeSlide(currentSlide === 1 ? 2 : 1); 
}
setInterval(() => { nextSlide(); }, 6500);

// Inicializar al cargar de forma robusta e inmediata
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderProducts);
} else {
    renderProducts();
}
