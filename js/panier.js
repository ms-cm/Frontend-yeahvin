(function() {
    'use strict';
    var Y = window.Yeahvin;
    var appliedPromo = null;
    var cartItemsDiv = document.getElementById('cartItems');
    var cartEmptyDiv = document.getElementById('cartEmpty');
    var cartContentDiv = document.getElementById('cartContent');
    var subtotalSpan = document.getElementById('subtotal');
    var totalSpan = document.getElementById('total');
    var discountLine = document.getElementById('discountLine');
    var discountSpan = document.getElementById('discount');
    var promoInput = document.getElementById('promoCode');
    var applyPromoBtn = document.getElementById('applyPromo');
    var promoFeedback = document.getElementById('promoFeedback');
    var checkoutBtn = document.getElementById('checkoutBtn');
    var checkoutForm = document.getElementById('checkoutForm');
    var checkoutStep1 = document.getElementById('checkoutStep1');
    var checkoutStep2 = document.getElementById('checkoutStep2');
    var customerNameInput = document.getElementById('customerName');
    var customerPhoneInput = document.getElementById('customerPhone');
    var confirmOrderBtn = document.getElementById('confirmOrderBtn');
    var backToCartBtn = document.getElementById('backToCartBtn');

    function renderCart() {
        if (!cartItemsDiv) return;
        var cart = Y.state.cart;
        if (cart.length === 0) { cartEmptyDiv.style.display = 'block'; cartContentDiv.style.display = 'none'; return; }
        cartEmptyDiv.style.display = 'none';
        cartContentDiv.style.display = 'grid';
        cartItemsDiv.innerHTML = '';
        cart.forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'cart-item';
            var imgDiv = document.createElement('div');
            imgDiv.className = 'cart-item__image';
            if (item.images && item.images.length > 0 && item.images[0].url) { var img = document.createElement('img'); img.src = item.images[0].url; img.alt = item.name; img.loading = 'lazy'; imgDiv.appendChild(img); }
            else { var pl = document.createElement('div'); pl.className = 'product-card__placeholder'; pl.style.fontSize = '36px'; pl.textContent = Y.getProductPlaceholder(item.category); imgDiv.appendChild(pl); }
            var infoDiv = document.createElement('div');
            infoDiv.className = 'cart-item__info';
            infoDiv.innerHTML = '<p class="cart-item__name">' + item.name + '</p><span class="cart-item__type">' + (item.type === 'physique' ? 'Physique' : 'Digital') + '</span> • <span class="cart-item__price">' + Y.formatPrice(item.price) + '</span>';
            var actions = document.createElement('div');
            actions.className = 'cart-item__actions';
            var qtyDiv = document.createElement('div');
            qtyDiv.className = 'cart-item__qty';
            var minus = document.createElement('button');
            minus.textContent = '−';
            minus.addEventListener('click', function() { Y.updateCartQty(item._id, item.qty - 1); renderCart(); });
            var qtySpan = document.createElement('span');
            qtySpan.textContent = item.qty;
            var plus = document.createElement('button');
            plus.textContent = '+';
            plus.addEventListener('click', function() { Y.updateCartQty(item._id, item.qty + 1); renderCart(); });
            qtyDiv.appendChild(minus); qtyDiv.appendChild(qtySpan); qtyDiv.appendChild(plus);
            var remove = document.createElement('button');
            remove.className = 'cart-item__remove';
            remove.innerHTML = '🗑️';
            remove.addEventListener('click', function() { Y.removeFromCart(item._id); appliedPromo = null; if (promoInput) promoInput.value = ''; if (promoFeedback) { promoFeedback.textContent = ''; promoFeedback.className = 'promo-feedback'; } renderCart(); Y.showToast('Produit retiré'); });
            actions.appendChild(qtyDiv); actions.appendChild(remove);
            div.appendChild(imgDiv); div.appendChild(infoDiv); div.appendChild(actions);
            cartItemsDiv.appendChild(div);
        });
        updateSummary();
    }

    function updateSummary() {
        var subtotal = Y.getCartTotal();
        subtotalSpan.textContent = Y.formatPrice(subtotal);
        var discountAmount = 0;
        if (appliedPromo && appliedPromo.valid) { discountAmount = Math.round((subtotal * appliedPromo.promoCode.discount) / 100); }
        var total = subtotal - discountAmount;
        discountLine.style.display = discountAmount > 0 ? 'flex' : 'none';
        discountSpan.textContent = '-' + Y.formatPrice(discountAmount);
        totalSpan.textContent = Y.formatPrice(total);
    }

    async function applyPromoCode() {
        var code = promoInput.value.trim();
        if (!code) { promoFeedback.textContent = 'Entrez un code.'; promoFeedback.className = 'promo-feedback promo-feedback--error'; return; }
        promoFeedback.textContent = 'Vérification...';
        promoFeedback.className = 'promo-feedback';
        try {
            var data = await Y.apiFetch('/api/promo/validate', { method: 'POST', body: JSON.stringify({ code: code, cartTotal: Y.getCartTotal() }) });
            if (data.valid) { appliedPromo = data; promoFeedback.textContent = data.message; promoFeedback.className = 'promo-feedback promo-feedback--success'; updateSummary(); }
            else { appliedPromo = null; promoFeedback.textContent = 'Code invalide ou expiré.'; promoFeedback.className = 'promo-feedback promo-feedback--error'; updateSummary(); }
        } catch (e) { appliedPromo = null; promoFeedback.textContent = e.message; promoFeedback.className = 'promo-feedback promo-feedback--error'; updateSummary(); }
    }

    function showCheckoutForm() {
        if (checkoutStep1) checkoutStep1.style.display = 'none';
        if (checkoutStep2) checkoutStep2.style.display = 'block';
    }

    function hideCheckoutForm() {
        if (checkoutStep1) checkoutStep1.style.display = 'block';
        if (checkoutStep2) checkoutStep2.style.display = 'none';
    }

    async function confirmOrder() {
        var name = customerNameInput.value.trim();
        var phone = customerPhoneInput.value.replace(/\s/g, '');
        if (!name) { Y.showToast('Entrez votre nom complet.', 'error'); return; }
        if (phone.length < 8) { Y.showToast('Numéro invalide.', 'error'); return; }
        confirmOrderBtn.disabled = true;
        confirmOrderBtn.textContent = 'Création...';
        try {
            var products = Y.state.cart.map(function(item) { return { productId: item._id, qty: item.qty }; });
            var body = { products: products, customerName: name, customerPhone: '+223' + phone, promoCode: appliedPromo ? appliedPromo.promoCode.code : null };
            var data = await Y.apiFetch('/api/orders/create-from-whatsapp', { method: 'POST', body: JSON.stringify(body) });
            Y.state.cart = [];
            Y.saveCart();
            renderCart();
            hideCheckoutForm();
            var msg = '🛒 *Nouvelle commande Yeahvin*%0A%0A*N° ' + data.order.orderNumber + '*%0A*Client :* ' + name + '%0A*Téléphone :* +223 ' + phone + '%0A*Total :* ' + Y.formatPrice(data.order.totalAmount) + '%0A%0A_Veuillez valider cette commande._';
            window.open('https://wa.me/22377555575?text=' + msg, '_blank');
            window.location.href = 'commande-confirmee.html?order=' + data.order.orderNumber;
        } catch (e) {
            Y.showToast('Erreur : ' + e.message, 'error');
            confirmOrderBtn.disabled = false;
            confirmOrderBtn.textContent = 'Confirmer la commande';
        }
    }

    function init() {
        if (!cartItemsDiv) return;
        renderCart();
        if (applyPromoBtn) applyPromoBtn.addEventListener('click', applyPromoCode);
        if (promoInput) promoInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); applyPromoCode(); } });
        if (checkoutBtn) checkoutBtn.addEventListener('click', showCheckoutForm);
        if (confirmOrderBtn) confirmOrderBtn.addEventListener('click', confirmOrder);
        if (backToCartBtn) backToCartBtn.addEventListener('click', hideCheckoutForm);
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();