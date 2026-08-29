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

    cards.forEach(function (card) {
      var cat = card.dataset.category;
      var price = parseFloat(card.dataset.price);
      var format = card.dataset.format;
      var author = card.dataset.author;

      var matchCategory = !groups.category || groups.category.indexOf(cat) !== -1;
      var matchPrice = !groups.price || groups.price.some(function (r) { return priceInRange(price, r); });
      var matchFormat = !groups.format || groups.format.indexOf(format) !== -1;
      var matchAuthor = !groups.author || groups.author.indexOf(author) !== -1;

      var visible = matchCategory && matchPrice && matchFormat && matchAuthor;
      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (resultsCount) {
      resultsCount.textContent = visibleCount + (visibleCount === 1 ? ' resultado' : ' resultados');
    }
    if (emptyResults) emptyResults.hidden = visibleCount !== 0;

    renderActiveChips();
    updateTitle(groups.category);
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

  function updateTitle(activeCategories) {
    if (!shopTitle) return;
    if (activeCategories && activeCategories.length === 1) {
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
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      checkboxes.forEach(function (cb) { cb.checked = false; });
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

  // ---- Preselección desde la URL (?cat=biblias) al llegar desde la Home ----
  var params = new URLSearchParams(window.location.search);
  var catParam = params.get('cat');
  if (catParam) {
    var match = checkboxes.filter(function (c) { return c.name === 'category' && c.value === catParam; })[0];
    if (match) match.checked = true;
  }

  applyFilters();
})();
