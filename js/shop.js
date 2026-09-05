// ==========================================================================
// Página de listado/categoría: filtros, orden, chips activos y drawer móvil.
// Solo se ejecuta si existe el grid de resultados (#bookGrid).
// ==========================================================================
(function () {
  var grid = document.getElementById('bookGrid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.book-card'));
  var checkboxes = Array.prototype.slice.call(document.querySelectorAll('.shop-filters input[type="checkbox"]'));
  var sortSelect = document.getElementById('sortSelect');
  var resultsCount = document.getElementById('resultsCount');
  var emptyResults = document.getElementById('emptyResults');
  var activeFiltersWrap = document.getElementById('activeFilters');
  var clearBtn = document.getElementById('filtersClear');
  var filterToggle = document.getElementById('filterToggle');
  var filters = document.getElementById('shopFilters');
  var applyMobileBtn = document.getElementById('filtersApplyMobile');
  var shopTitle = document.querySelector('[data-shop-title]');
  var breadcrumbCurrent = document.querySelector('[data-breadcrumb-current]');
  var searchInput = document.querySelector('.search-form input[name="q"]');

  var CATEGORY_LABELS = {
    biblias: 'Biblias',
    'elena-white': 'Elena G. White',
    salud: 'Salud y familia',
    profecia: 'Profecía',
    devocionales: 'Devocionales',
    infantil: 'Infantil y juvenil'
  };

  function groupedChecks() {
    var groups = {};
    checkboxes.forEach(function (cb) {
      if (!cb.checked) return;
      groups[cb.name] = groups[cb.name] || [];
      groups[cb.name].push(cb.value);
    });
    return groups;
  }

  function priceInRange(price, range) {
    var parts = range.split('-').map(Number);
    return price >= parts[0] && price <= parts[1];
  }

  function applyFilters() {
    var groups = groupedChecks();
    var visibleCount = 0;
    var query = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();

    cards.forEach(function (card) {
      var cat = card.dataset.category;
      var price = parseFloat(card.dataset.price);
      var format = card.dataset.format;
      var author = card.dataset.author;

      var matchCategory = !groups.category || groups.category.indexOf(cat) !== -1;
      var matchPrice = !groups.price || groups.price.some(function (r) { return priceInRange(price, r); });
      var matchFormat = !groups.format || groups.format.indexOf(format) !== -1;
      var matchAuthor = !groups.author || groups.author.indexOf(author) !== -1;
      var matchQuery = !query || cardText(card).indexOf(query) !== -1;

      var visible = matchCategory && matchPrice && matchFormat && matchAuthor && matchQuery;
      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (resultsCount) {
      resultsCount.textContent = visibleCount + (visibleCount === 1 ? ' resultado' : ' resultados');
    }
    if (emptyResults) emptyResults.hidden = visibleCount !== 0;

    renderActiveChips();
    updateTitle(groups.category, query);
  }

  // Texto de título + autor + categoría de una tarjeta, en minúsculas, para buscar por coincidencia simple.
  function cardText(card) {
    var titleEl = card.querySelector('.book-title');
    var authorEl = card.querySelector('.book-author');
    var catEl = card.querySelector('.book-category');
    return [
      titleEl ? titleEl.textContent : '',
      authorEl ? authorEl.textContent : '',
      catEl ? catEl.textContent : ''
    ].join(' ').toLowerCase();
  }

  function renderActiveChips() {
    if (!activeFiltersWrap) return;
    activeFiltersWrap.innerHTML = '';
    var any = false;
    checkboxes.forEach(function (cb) {
      if (!cb.checked) return;
      any = true;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.innerHTML = cb.nextElementSibling.textContent + ' <span aria-hidden="true">×</span>';
      chip.addEventListener('click', function () {
        cb.checked = false;
        applyFilters();
      });
      activeFiltersWrap.appendChild(chip);
    });
    activeFiltersWrap.hidden = !any;
  }

  function updateTitle(activeCategories, query) {
    if (!shopTitle) return;
    if (query) {
      shopTitle.textContent = 'Resultados para «' + query + '»';
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Búsqueda';
    } else if (activeCategories && activeCategories.length === 1) {
      var label = CATEGORY_LABELS[activeCategories[0]] || 'Catálogo';
      shopTitle.textContent = label;
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = label;
    } else {
      shopTitle.textContent = 'Todos los libros';
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Catálogo';
    }
  }

  function applySort() {
    var value = sortSelect ? sortSelect.value : 'relevance';
    if (value === 'relevance') return;
    var sorted = cards.slice().sort(function (a, b) {
      if (value === 'price-asc') return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
      if (value === 'price-desc') return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
      if (value === 'title-asc') {
        var ta = a.querySelector('.book-title').textContent.trim();
        var tb = b.querySelector('.book-title').textContent.trim();
        return ta.localeCompare(tb, 'es');
      }
      return 0;
    });
    sorted.forEach(function (card) { grid.appendChild(card); });
  }

  checkboxes.forEach(function (cb) { cb.addEventListener('change', applyFilters); });
  if (sortSelect) sortSelect.addEventListener('change', applySort);
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      checkboxes.forEach(function (cb) { cb.checked = false; });
      if (searchInput) searchInput.value = '';
      applyFilters();
    });
  }

  if (filterToggle && filters) {
    filterToggle.addEventListener('click', function () {
      var isOpen = filters.classList.toggle('is-open');
      filterToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.classList.toggle('no-scroll', isOpen);
    });
  }
  if (applyMobileBtn && filters) {
    applyMobileBtn.addEventListener('click', function () {
      filters.classList.remove('is-open');
      if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    });
  }

  // ---- Preselección desde la URL (?cat=biblias, ?q=texto) al llegar desde la Home o el buscador ----
  var params = new URLSearchParams(window.location.search);
  var catParam = params.get('cat');
  var qParam = params.get('q');
  if (catParam) {
    var match = checkboxes.filter(function (c) { return c.name === 'category' && c.value === catParam; })[0];
    if (match) match.checked = true;
  }
  if (qParam && searchInput) {
    searchInput.value = qParam;
  }

  applyFilters();
})();
