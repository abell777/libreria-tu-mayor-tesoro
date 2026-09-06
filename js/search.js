// ==========================================================================
// Buscador con autocompletado: se engancha a cualquier .search-form del
// header (misma barra que ya existe) y muestra sugerencias en vivo desde
// window.BOOKS mientras el usuario escribe, con navegación por teclado.
// Si una página no carga js/books-data.js, el formulario sigue funcionando
// como buscador normal (envía a categoria.html?q=...).
// ==========================================================================
(function () {
  if (!window.BOOKS) return;
  var forms = document.querySelectorAll('.search-form');
  if (!forms.length) return;

  function normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function fmtPrice(n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function search(query) {
    var q = normalize(query.trim());
    if (!q) return [];
    return window.BOOKS.filter(function (b) {
      return normalize(b.title).indexOf(q) !== -1 ||
        normalize(b.author).indexOf(q) !== -1 ||
        normalize(b.categoryLabel).indexOf(q) !== -1;
    }).slice(0, 6);
  }

  function setupForm(form) {
    var input = form.querySelector('input[name="q"]');
    if (!input) return;

    var panel = document.createElement('div');
    panel.className = 'search-suggestions';
    panel.hidden = true;
    panel.setAttribute('role', 'listbox');
    form.appendChild(panel);
    form.classList.add('has-search-suggestions');

    var activeIndex = -1;

    function suggestionHTML(b, i) {
      return (
        '<a href="producto.html?id=' + b.id + '" class="search-suggestion" role="option" data-index="' + i + '">' +
          '<img src="' + b.cover + '" alt="" loading="lazy">' +
          '<span class="search-suggestion-info"><strong>' + escapeHTML(b.title) + '</strong><small>' + escapeHTML(b.author) + '</small></span>' +
          '<span class="search-suggestion-price">' + fmtPrice(b.price) + '&nbsp;€</span>' +
        '</a>'
      );
    }

    function render(query) {
      var results = search(query);
      activeIndex = -1;

      if (!results.length) {
        panel.innerHTML = '<p class="search-suggestions-empty">Sin resultados para «' + query + '».</p>' +
          '<a href="categoria.html?q=' + encodeURIComponent(query) + '" class="search-suggestion search-suggestion--all">Buscar en todo el catálogo</a>';
        panel.hidden = false;
        return;
      }

      panel.innerHTML = results.map(suggestionHTML).join('') +
        '<a href="categoria.html?q=' + encodeURIComponent(query) + '" class="search-suggestion search-suggestion--all">Ver todos los resultados para «' + query + '»</a>';
      panel.hidden = false;
    }

    function close() {
      panel.hidden = true;
      activeIndex = -1;
    }

    input.addEventListener('input', function () {
      var query = input.value.trim();
      if (!query) { close(); return; }
      render(query);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim()) render(input.value.trim());
    });

    input.addEventListener('keydown', function (e) {
      var items = panel.querySelectorAll('.search-suggestion');
      if (panel.hidden || !items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        paintActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        paintActive(items);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].click();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    function paintActive(items) {
      items.forEach(function (it, i) { it.classList.toggle('is-active', i === activeIndex); });
      if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) close();
    });
  }

  forms.forEach(setupForm);
})();
