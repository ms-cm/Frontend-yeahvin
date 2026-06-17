(function() {
    'use strict';
    var Y = window.Yeahvin;
    var currentProduct = null;
    var currentQty = 1;
    function getProductId() { return new URLSearchParams(window.location.search).get('id'); }
    async function loadProduct() {
        var id = getProductId();
        if (!id) { showError('Produit non trouvé.'); return; }
        try {
            var data = await Y.apiFetch('/api/products/' + id);
            currentProduct = data.product;
            renderProduct(currentProduct);
            loadSimilar(id);
        } catch (e) { showError(e.message); }
    }
    function showError(msg) {
        document.getElementById('productLoader').style.display = 'none';
        document.getElementById('productContent').style.display = 'none';
        var d = document.getElementById('productDetail');
        d.innerHTML = '<div class="container"><div class="empty-state"><span class="empty-state__icon">😕</span><h3>Produit introuvable</h3><p>' + msg + '</p><a href="boutique.html" class="btn btn--primary" style="margin-top:16px;">Retour à la boutique</a></div></div>';
    }
    function renderProduct(p) {
        document.title = p.name + ' — Yeahvin';
        document.getElementById('productLoader').style.display = 'none';
        document.getElementById('productContent').style.display = 'grid';
        renderGallery(p);
        renderInfo(p);
    }
    function renderGallery(p) {
        var g = document.getElementById('productGallery');
        g.innerHTML = '';
        var mainDiv = document.createElement('div');
        mainDiv.className = 'product-detail__main-image';
        if (p.images && p.images.length > 0 && p.images[0].url) {
            var img = document.createElement('img');
            img.src = p.images[0].url;
            img.alt = p.name;
            img.id = 'mainImage';
            mainDiv.appendChild(img);
        } else { var pl = document.createElement('div'); pl.className = 'product-card__placeholder'; pl.style.fontSize = '120px'; pl.textContent = Y.getProductPlaceholder(p.category); mainDiv.appendChild(pl); }
        g.appendChild(mainDiv);
        if (p.images && p.images.length > 1) {
            var thumbs = document.createElement('div');
            thumbs.className = 'product-detail__thumbnails';
            p.images.forEach(function(imgData, i) {
                var t = document.createElement('div');
                t.className = 'product-detail__thumb' + (i === 0 ? ' product-detail__thumb--active' : '');
                var ti = document.createElement('img');
                ti.src = imgData.url;
                ti.alt = p.name + ' - ' + (i + 1);
                ti.loading = 'lazy';
                t.appendChild(ti);
                t.addEventListener('click', function() {
                    var mi = document.getElementById('mainImage');
                    if (mi) mi.src = imgData.url;
                    thumbs.querySelectorAll('.product-detail__thumb').forEach(function(tt) { tt.classList.remove('product-detail__thumb--active'); });
                    t.classList.add('product-detail__thumb--active');
                });
                thumbs.appendChild(t);
            });
            g.appendChild(thumbs);
        }
    }
    function renderInfo(p) {
        var info = document.getElementById('productInfo');
        info.innerHTML = '';
        var typeSpan = document.createElement('span');
        typeSpan.className = 'product-detail__type product-detail__type--' + (p.type || 'digital');
        typeSpan.textContent = p.type === 'physique' ? '📦 Produit Physique' : '💻 Produit Digital';
        info.appendChild(typeSpan);
        var h1 = document.createElement('h1');
        h1.className = 'product-detail__name';
        h1.textContent = p.name;
        info.appendChild(h1);
        var priceDiv = document.createElement('div');
        priceDiv.className = 'product-detail__price';
        priceDiv.innerHTML = Y.formatPrice(p.price) + ' <span>• Livraison calculée à la commande</span>';
        info.appendChild(priceDiv);
        var desc = document.createElement('p');
        desc.className = 'product-detail__desc';
        desc.textContent = p.description;
        info.appendChild(desc);
        var meta = document.createElement('div');
        meta.className = 'product-detail__meta';
        if (p.category) { var ci = document.createElement('div'); ci.className = 'product-detail__meta-item'; ci.innerHTML = '📂 Catégorie : <span>' + p.category + '</span>'; meta.appendChild(ci); }
        if (p.type === 'digital') { var di = document.createElement('div'); di.className = 'product-detail__meta-item'; di.innerHTML = '⚡ Livraison : <span>Instantanée</span>'; meta.appendChild(di); }
        if (p.stock !== undefined) { var si = document.createElement('div'); si.className = 'product-detail__meta-item'; si.innerHTML = '📊 Stock : <span>' + (p.stock > 0 ? p.stock + ' dispo.' : 'Épuisé') + '</span>'; meta.appendChild(si); }
        info.appendChild(meta);
        var actions = document.createElement('div');
        actions.className = 'product-detail__actions';
        var qtyDiv = document.createElement('div');
        qtyDiv.className = 'product-detail__qty';
        var minus = document.createElement('button');
        minus.textContent = '−';
        minus.addEventListener('click', function() { if (currentQty > 1) { currentQty--; qtyInput.value = currentQty; } });
        var qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.value = currentQty;
        qtyInput.min = '1';
        qtyInput.max = String(p.stock || 99);
        qtyInput.addEventListener('change', function() { var v = parseInt(this.value); if (isNaN(v) || v < 1) v = 1; if (p.stock && v > p.stock) v = p.stock; currentQty = v; this.value = v; });
        var plus = document.createElement('button');
        plus.textContent = '+';
        plus.addEventListener('click', function() { var max = p.stock || 99; if (currentQty < max) { currentQty++; qtyInput.value = currentQty; } });
        qtyDiv.appendChild(minus);
        qtyDiv.appendChild(qtyInput);
        qtyDiv.appendChild(plus);
        actions.appendChild(qtyDiv);
        var addBtn = document.createElement('button');
        addBtn.className = 'btn btn--primary product-detail__add-cart';
        addBtn.textContent = '🛒 Ajouter au panier';
        addBtn.addEventListener('click', function() { Y.addToCart(p, currentQty); Y.showToast(p.name + ' ajouté au panier !'); });
        actions.appendChild(addBtn);
        info.appendChild(actions);
        var wp = document.createElement('p');
        wp.style.cssText = 'margin-top:16px;font-size:14px;color:var(--text-muted);';
        wp.innerHTML = '💬 Des questions ? <a href="https://wa.me/22377555575" style="color:var(--blue-400);">Contactez-nous sur WhatsApp</a>';
        info.appendChild(wp);
    }
    async function loadSimilar(id) {
        var grid = document.getElementById('similarGrid');
        if (!grid) return;
        try {
            var data = await Y.apiFetch('/api/products/' + id + '/similar');
            grid.innerHTML = '';
            if (data.products && data.products.length > 0) { data.products.forEach(function(p) { grid.appendChild(Y.buildProductCard(p)); }); }
            else { document.getElementById('similarProducts').style.display = 'none'; }
        } catch (e) { document.getElementById('similarProducts').style.display = 'none'; }
    }
    function init() { if (document.getElementById('productDetail')) loadProduct(); }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();