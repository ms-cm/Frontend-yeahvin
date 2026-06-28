(function() {
    'use strict';
    var API_BASE = 'https://yeahvin-backend.onrender.com';
    var state = {
        cart: JSON.parse(localStorage.getItem('yeahvin_cart')) || [],
        auth: JSON.parse(localStorage.getItem('yeahvin_auth')) || null
    };
    function saveCart() { localStorage.setItem('yeahvin_cart', JSON.stringify(state.cart)); updateCartBadge(); }
    function updateCartBadge() {
        var badge = document.getElementById('cartBadge');
        if (!badge) return;
        var total = state.cart.reduce(function(s, i) { return s + i.qty; }, 0);
        badge.textContent = total || '';
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
    function formatPrice(p) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(p).replace('XOF', 'FCFA'); }
    function showToast(msg, type) {
        type = type || 'success';
        var t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'toast toast--' + type + ' toast--visible';
        clearTimeout(t._t);
        t._t = setTimeout(function() { t.classList.remove('toast--visible'); }, 3000);
    }
    function getPlaceholder(cat) { var p = { templates: '🎨', ebooks: '📚', scripts: '🛠️', goodies: '👕' }; return p[cat] || '📦'; }
    function createPlaceholder(cat) { var d = document.createElement('div'); d.className = 'product-card__placeholder'; d.textContent = getPlaceholder(cat); return d; }
    function buildProductCard(product) {
        var card = document.createElement('a');
        card.href = 'produit.html?id=' + product._id;
        card.className = 'product-card';
        var imgDiv = document.createElement('div');
        imgDiv.className = 'product-card__image';
        if (product.images && product.images.length > 0 && product.images[0].url) {
            var img = document.createElement('img');
            img.src = product.images[0].url;
            img.alt = product.name;
            img.loading = 'lazy';
            img.addEventListener('error', function() { this.replaceWith(createPlaceholder(product.category)); });
            imgDiv.appendChild(img);
        } else { imgDiv.appendChild(createPlaceholder(product.category)); }
        var typeBadge = document.createElement('span');
        typeBadge.className = 'product-card__badge product-card__badge--' + (product.type || 'digital');
        typeBadge.textContent = product.type === 'physique' ? 'Physique' : 'Digital';
        imgDiv.appendChild(typeBadge);
        if (product.featured) {
            var fb = document.createElement('span');
            fb.className = 'product-card__badge product-card__badge--featured';
            fb.textContent = '★ Vedette';
            imgDiv.appendChild(fb);
        }
        var body = document.createElement('div');
        body.className = 'product-card__body';
        var catSpan = document.createElement('span');
        catSpan.className = 'product-card__category';
        catSpan.textContent = product.category || '';
        var nameH3 = document.createElement('h3');
        nameH3.className = 'product-card__name';
        nameH3.textContent = product.name;
        var descP = document.createElement('p');
        descP.className = 'product-card__desc';
        descP.textContent = product.description || '';
        var footer = document.createElement('div');
        footer.className = 'product-card__footer';
        var priceSpan = document.createElement('span');
        priceSpan.className = 'product-card__price';
        priceSpan.textContent = formatPrice(product.price);
        var addBtn = document.createElement('button');
        addBtn.className = 'product-card__btn';
        addBtn.innerHTML = '🛒';
        addBtn.setAttribute('aria-label', 'Ajouter au panier');
        addBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); addToCart(product, 1); showToast('Ajouté au panier !'); });
        footer.appendChild(priceSpan);
        footer.appendChild(addBtn);
        body.appendChild(catSpan);
        body.appendChild(nameH3);
        body.appendChild(descP);
        body.appendChild(footer);
        card.appendChild(imgDiv);
        card.appendChild(body);
        return card;
    }
    function addToCart(product, qty) {
        qty = qty || 1;
        var ex = state.cart.find(function(i) { return i._id === product._id; });
        if (ex) { ex.qty += qty; }
        else { state.cart.push({ _id: product._id, name: product.name, price: product.price, type: product.type || 'digital', category: product.category, images: product.images, qty: qty }); }
        saveCart();
    }
    function removeFromCart(id) { state.cart = state.cart.filter(function(i) { return i._id !== id; }); saveCart(); }
    function updateCartQty(id, qty) { if (qty <= 0) { removeFromCart(id); return; } var item = state.cart.find(function(i) { return i._id === id; }); if (item) item.qty = qty; saveCart(); }
    function getCartTotal() { return state.cart.reduce(function(s, i) { return s + (i.price * i.qty); }, 0); }
    function initMobileNav() {
        var nav = document.getElementById('nav');
        var toggle = document.getElementById('navToggle');
        if (!nav || !toggle) return;
        toggle.addEventListener('click', function() { var o = nav.classList.toggle('nav--open'); toggle.classList.toggle('nav-toggle--open', o); });
        nav.querySelectorAll('.nav__link').forEach(function(l) { l.addEventListener('click', function() { nav.classList.remove('nav--open'); toggle.classList.remove('nav-toggle--open'); }); });
        document.addEventListener('click', function(e) { if (!nav.contains(e.target) && !toggle.contains(e.target)) { nav.classList.remove('nav--open'); toggle.classList.remove('nav-toggle--open'); } });
    }
    async function apiFetch(endpoint, options) {
        options = options || {};
        var url = API_BASE + endpoint;
        var headers = { 'Content-Type': 'application/json' };
        if (options.headers) { for (var k in options.headers) headers[k] = options.headers[k]; }
        if (state.auth && state.auth.token) headers['Authorization'] = 'Bearer ' + state.auth.token;
        var config = { method: options.method || 'GET', headers: headers };
        if (options.body) config.body = options.body;
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 45000);
        config.signal = controller.signal;
        try {
            var response = await fetch(url, config);
            clearTimeout(timeout);
            if (!response.ok) { var ed = await response.json().catch(function() { return {}; }); throw new Error(ed.message || ed.error || 'Erreur ' + response.status); }
            return await response.json();
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') throw new Error('Le serveur met du temps à répondre...');
            throw error;
        }
    }
    function init() { updateCartBadge(); initMobileNav(); }
    window.Yeahvin = {
        API_BASE: API_BASE, state: state, formatPrice: formatPrice, showToast: showToast,
        getProductPlaceholder: getPlaceholder, buildProductCard: buildProductCard,
        addToCart: addToCart, removeFromCart: removeFromCart, updateCartQty: updateCartQty,
        getCartTotal: getCartTotal, saveCart: saveCart, updateCartBadge: updateCartBadge, apiFetch: apiFetch
    };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
/* ============================================================
   MICRO-INTERACTIONS & TRANSITIONS — ajout à main.js
   ============================================================ */
(function() {

    /* 1. EFFET RIPPLE sur tous les .btn au clic */
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.btn, .product-card__btn, .btn--download, .btn--regenerate');
        if (!btn) return;
        var r = btn.getBoundingClientRect();
        var size = Math.max(r.width, r.height) * 2;
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size/2) + 'px;top:' + (e.clientY - r.top - size/2) + 'px;';
        btn.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
    });

    /* 2. REBOND + ANIMATION BADGE sur ajout au panier */
    var _origSaveCart = window.Yeahvin && window.Yeahvin.saveCart;
    if (window.Yeahvin) {
        window.Yeahvin.saveCart = function() {
            // rebond sur le bouton qui a déclenché l'ajout
            var lastBtn = document.activeElement;
            if (lastBtn && lastBtn.classList.contains('product-card__btn')) {
                lastBtn.classList.remove('product-card__btn--bounce');
                void lastBtn.offsetWidth; // force reflow
                lastBtn.classList.add('product-card__btn--bounce');
                lastBtn.addEventListener('animationend', function() {
                    lastBtn.classList.remove('product-card__btn--bounce');
                }, { once: true });
            }
            // pop du badge
            var badge = document.getElementById('cartBadge');
            if (badge) {
                badge.classList.remove('cart-badge--pop');
                void badge.offsetWidth;
                badge.classList.add('cart-badge--pop');
                badge.addEventListener('animationend', function() {
                    badge.classList.remove('cart-badge--pop');
                }, { once: true });
            }
            if (_origSaveCart) _origSaveCart.call(window.Yeahvin);
        };
    }

    /* 3. TRANSITION ENTRE PAGES — overlay fade */
    var overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);

    document.addEventListener('click', function(e) {
        var link = e.target.closest('a[href]');
        if (!link) return;
        var href = link.getAttribute('href');
        // Ignorer les ancres, mailto, tel, target=_blank, JS
        if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel') || href.startsWith('javascript') || link.target === '_blank') return;
        // Ignorer Ctrl+clic / Cmd+clic
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        overlay.classList.add('page-transition-overlay--visible');
        setTimeout(function() { window.location.href = href; }, 260);
    });

})();
