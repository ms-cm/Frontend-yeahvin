(function() {
    'use strict';
    var Y = window.Yeahvin;
    var currentPage = 1, currentCategory = '', currentSearch = '', currentSort = '-createdAt', totalPages = 1;
    var grid = document.getElementById('allProducts');
    var searchInput = document.getElementById('searchInput');
    var sortSelect = document.getElementById('sortSelect');
    var filterBtns = document.querySelectorAll('.filter-btn');
    var paginationDiv = document.getElementById('pagination');
    var emptyState = document.getElementById('emptyState');

    async function loadProducts(page) {
        page = page || 1;
        if (!grid) return;
        grid.innerHTML = '';
        for (var i = 0; i < 8; i++) { var sk = document.createElement('div'); sk.className = 'loading-skeleton'; grid.appendChild(sk); }
        if (emptyState) emptyState.style.display = 'none';
        try {
            var params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', '20');
            params.append('sort', currentSort);
            if (currentCategory) params.append('category', currentCategory);
            if (currentSearch) params.append('search', currentSearch);
            var data = await Y.apiFetch('/api/products?' + params.toString());
            grid.innerHTML = '';
            if (!data.products || data.products.length === 0) { if (emptyState) emptyState.style.display = 'block'; if (paginationDiv) paginationDiv.innerHTML = ''; return; }
            if (emptyState) emptyState.style.display = 'none';
            data.products.forEach(function(p) { grid.appendChild(Y.buildProductCard(p)); });
            totalPages = data.pagination.totalPages;
            currentPage = data.pagination.currentPage;
            buildPagination();
        } catch (e) {
            grid.innerHTML = '';
            if (emptyState) { emptyState.style.display = 'block'; emptyState.querySelector('h3').textContent = 'Erreur'; emptyState.querySelector('p').textContent = e.message; }
        }
    }

    function buildPagination() {
        if (!paginationDiv) return;
        if (totalPages <= 1) { paginationDiv.innerHTML = ''; return; }
        paginationDiv.innerHTML = '';
        var prev = document.createElement('button');
        prev.textContent = '←';
        prev.disabled = currentPage <= 1;
        prev.addEventListener('click', function() { if (currentPage > 1) { loadProducts(currentPage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
        paginationDiv.appendChild(prev);
        var start = Math.max(1, currentPage - 2);
        var end = Math.min(totalPages, currentPage + 2);
        for (var i = start; i <= end; i++) {
            var btn = document.createElement('button');
            btn.textContent = i;
            if (i === currentPage) btn.classList.add('active');
            btn.addEventListener('click', function(ii) { return function() { loadProducts(ii); window.scrollTo({ top: 0, behavior: 'smooth' }); }; }(i));
            paginationDiv.appendChild(btn);
        }
        var next = document.createElement('button');
        next.textContent = '→';
        next.disabled = currentPage >= totalPages;
        next.addEventListener('click', function() { if (currentPage < totalPages) { loadProducts(currentPage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
        paginationDiv.appendChild(next);
    }

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterBtns.forEach(function(b) { b.classList.remove('filter-btn--active'); });
            btn.classList.add('filter-btn--active');
            currentCategory = btn.getAttribute('data-category');
            currentPage = 1;
            loadProducts(1);
        });
    });

    if (searchInput) {
        var debounce;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounce);
            debounce = setTimeout(function() { currentSearch = searchInput.value.trim(); currentPage = 1; loadProducts(1); }, 400);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function() { currentSort = sortSelect.value; currentPage = 1; loadProducts(1); });
    }

    function initFromURL() {
        var params = new URLSearchParams(window.location.search);
        var cat = params.get('category');
        if (cat) { currentCategory = cat; filterBtns.forEach(function(b) { b.classList.remove('filter-btn--active'); if (b.getAttribute('data-category') === cat) b.classList.add('filter-btn--active'); }); }
    }

    function init() { if (!grid) return; initFromURL(); loadProducts(1); }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();