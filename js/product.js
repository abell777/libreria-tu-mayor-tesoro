// ==========================================================================
// Ficha de producto dinámica: lee ?id= de la URL, busca el libro en
// window.BOOKS (js/books-data.js) y rellena toda la página. Incluye
// opiniones (Firestore, colección "resenas") y el botón de lista de deseos.
// Solo se ejecuta si existe el layout de producto (#productLayout).
// ==========================================================================
(function () {
  var layout = document.getElementById('productLayout');
  if (!layout || !window.BOOKS) return;

  var CATEGORY_LABELS = {
    biblias: 'Biblias', 'elena-white': 'Elena G. White', salud: 'Salud y familia',
    profecia: 'Profecía', devocionales: 'Devocionales', infantil: 'Infantil y juvenil'
  };

  function fmtPrice(n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var params = new URLSearchParams(window.location.search);
  var book = window.BooksCatalog.getById(params.get('id'));

  if (!book) {
    var notFound = document.getElementById('productNotFound');
    if (notFound) notFound.hidden = false;
    return;
  }

  layout.hidden = false;

  // ¿Libro anunciado pero todavía sin precio? (campo "comingSoon" del
  // catálogo). En ese caso se muestra la portada y un aviso de próxima
  // disponibilidad, pero no se puede comprar.
  var comingSoon = window.isComingSoon ? window.isComingSoon(book) : false;

  // Portadas disponibles de este mismo libro (1 o varias).
  var covers = window.bookCovers ? window.bookCovers(book) : [{ style: 'ilustrada', file: book.cover, label: 'Estándar', short: 'Portada estándar', desc: '' }];
  var coverIndex = 0;

  // ---- SEO: título, meta descripción, OG/Twitter, canonical, migas de pan ----
  var pageTitle = book.title + ' — Librería tu mayor tesoro';
  document.title = pageTitle;
  var setMeta = function (id, value) { var el = document.getElementById(id); if (el) el.setAttribute('content', value); };
  setMeta('metaDescription', book.description.slice(0, 155));
  setMeta('ogTitle', pageTitle);
  setMeta('ogDescription', book.description.slice(0, 155));
  setMeta('ogUrl', 'https://www.libreriatumayortesoro.com/producto.html?id=' + book.id);
  setMeta('twitterTitle', pageTitle);
  setMeta('twitterDescription', book.description.slice(0, 155));
  var coverUrl = 'https://www.libreriatumayortesoro.com/' + book.cover;
  setMeta('ogImage', coverUrl);
  setMeta('twitterImage', coverUrl);
  var canonical = document.getElementById('canonicalLink');
  if (canonical) canonical.setAttribute('href', 'https://www.libreriatumayortesoro.com/producto.html?id=' + book.id);

  // Migas de pan estructuradas (Inicio > Categoría > Libro): Google las usa
  // para mostrar la ruta de navegación en el resultado de búsqueda.
  (function injectBreadcrumbJsonLd() {
    var data = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.libreriatumayortesoro.com/' },
        { '@type': 'ListItem', position: 2, name: book.categoryLabel, item: 'https://www.libreriatumayortesoro.com/categoria.html?cat=' + book.category },
        { '@type': 'ListItem', position: 3, name: book.title, item: 'https://www.libreriatumayortesoro.com/producto.html?id=' + book.id }
      ]
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumbJsonLd';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  })();

  var breadcrumbCategory = document.getElementById('breadcrumbCategory');
  if (breadcrumbCategory) {
    breadcrumbCategory.href = 'categoria.html?cat=' + book.category;
    breadcrumbCategory.textContent = book.categoryLabel;
  }
  var breadcrumbTitle = document.getElementById('breadcrumbTitle');
  if (breadcrumbTitle) breadcrumbTitle.textContent = book.title;

  // ---- Contenido principal ----
  var badgeEl = document.getElementById('productBadge');
  if (badgeEl) {
    if (book.badge) { badgeEl.textContent = book.badge; badgeEl.hidden = false; }
    else badgeEl.hidden = true;
  }
  var coverImg = document.getElementById('productCoverImg');
  if (coverImg) {
    coverImg.onerror = function () { coverImg.onerror = null; coverImg.src = book.cover; };
    coverImg.src = toWebp(book.cover);
    coverImg.alt = 'Portada de «' + book.title + '», de ' + book.author;
    coverImg.setAttribute('fetchpriority', 'high');
  }

  document.getElementById('productCategory').textContent = book.categoryLabel;
  var titleEl = document.getElementById('productTitle');
  titleEl.textContent = book.title;
  var lang = window.idiomaToLang ? window.idiomaToLang(book.idioma) : 'es';
  if (lang !== 'es') titleEl.setAttribute('lang', lang); else titleEl.removeAttribute('lang');
  document.getElementById('productAuthor').textContent = book.author;
  var priceEl = document.getElementById('productPrice');
  var priceNoteEl = document.getElementById('productPriceNote');
  if (comingSoon) {
    priceEl.childNodes[0].textContent = 'Precio próximamente ';
    priceEl.classList.add('product-price--soon');
    priceNoteEl.textContent = 'Estamos preparando esta edición';
  } else {
    priceEl.childNodes[0].textContent = fmtPrice(book.price) + '\u00A0€ ';
    priceNoteEl.textContent = book.priceNote;
  }
  document.getElementById('productDesc').textContent = book.description;
  document.getElementById('productDescLong').textContent = book.description;

  // ---- Puntos destacados (opcional): lista de viñetas por encima o por
  // debajo de la descripción larga. Solo aparece si el libro define
  // "highlights" (array de frases cortas) en js/books-data.js; si no,
  // la pestaña "Descripción" se queda solo con el párrafo, como hasta ahora.
  var descPanel = document.querySelector('[data-tab-panel="descripcion"]');
  var existingHighlights = document.getElementById('productHighlights');
  if (existingHighlights) existingHighlights.remove();
  if (descPanel && Array.isArray(book.highlights) && book.highlights.length) {
    var ul = document.createElement('ul');
    ul.id = 'productHighlights';
    ul.className = 'product-highlights';
    ul.innerHTML = book.highlights.map(function (h) { return '<li>' + escapeHTML(h) + '</li>'; }).join('');
    descPanel.appendChild(ul);
  }

  // ---- Ficha técnica: encuadernación, acabado y papel primero (lo más
  // relevante a la hora de comprar un libro físico), y solo se muestran
  // las filas cuyo dato exista para este libro en concreto.
  var specList = document.getElementById('productSpecList');
  if (specList) {
    var bindingLabel = { 'tapa-dura': 'Tapa dura', rustica: 'Tapa blanda' }[book.formatSlug];
    var specRows = [];
    if (bindingLabel) specRows.push(['Encuadernación', bindingLabel]);
    if (book.finish) specRows.push(['Acabado de cubierta', book.finish]);
    if (book.paper) specRows.push(['Tipo de papel', book.paper]);
    // "Ideal para": las necesidades que cubre este libro (¿Qué busca tu
    // alma hoy?). Cada una es un enlace al catálogo ya filtrado.
    if (Array.isArray(book.needs) && book.needs.length && window.NEED_LABELS) {
      var necesidades = book.needs.map(function (n) {
        return '<a href="categoria.html?need=' + encodeURIComponent(n) + '">' +
          escapeHTML(window.NEED_LABELS[n] || n) + '</a>';
      }).join(', ');
      specRows.push(['Ideal para', necesidades, true]);
    }
    if (Array.isArray(book.subcategory) && book.subcategory.length && window.SUBCATEGORY_LABELS) {
      var temas = book.subcategory.map(function (s) { return window.SUBCATEGORY_LABELS[s] || s; }).join(', ');
      specRows.push(['Tema', temas]);
    }
    if (book.bibleVersion && window.BIBLE_VERSION_LABELS) specRows.push(['Versión', window.BIBLE_VERSION_LABELS[book.bibleVersion] || book.bibleVersion]);
    if (book.bibleEdition && window.BIBLE_EDITION_LABELS) specRows.push(['Edición', window.BIBLE_EDITION_LABELS[book.bibleEdition] || book.bibleEdition]);
    if (book.bibleColor && window.BIBLE_COLOR_LABELS) specRows.push(['Color de cubierta', window.BIBLE_COLOR_LABELS[book.bibleColor] || book.bibleColor]);
    if (book.bibleClosure && window.BIBLE_CLOSURE_LABELS) specRows.push(['Cierre', window.BIBLE_CLOSURE_LABELS[book.bibleClosure] || book.bibleClosure]);
    if (book.bibleSize && window.BIBLE_SIZE_LABELS) specRows.push(['Tamaño', window.BIBLE_SIZE_LABELS[book.bibleSize] || book.bibleSize]);
    specRows.push(['Formato', book.format]);
    specRows.push(['Categoría', book.categoryLabel]);
    specRows.push(['Autor', book.author]);
    specRows.push(['Idioma', book.idioma]);
    specList.innerHTML = specRows
      .map(function (row) {
        // El tercer elemento (opcional) indica que el valor ya viene como
        // HTML seguro creado aquí arriba (enlaces), no como texto plano.
        var valor = row[2] ? row[1] : escapeHTML(row[1]);
        return '<li><span>' + escapeHTML(row[0]) + '</span><span>' + valor + '</span></li>';
      }).join('');
  }

  // ---- Sello de encuadernación sobre la portada (tapa dura / tapa blanda) ----
  var bindingEl = document.getElementById('productBinding');
  if (bindingEl) {
    var isHardcover = book.formatSlug === 'tapa-dura';
    bindingEl.className = 'binding-tag binding-tag--' + book.formatSlug;
    bindingEl.innerHTML = (isHardcover
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 4v13a3 3 0 0 0 3 3h13"/><line x1="8" y1="8" x2="15" y2="8"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5S5 4 12 6c7-2 10-0.5 10-0.5v13S19 17 12 19c-7-2-10-0.5-10-0.5z"/><line x1="12" y1="6" x2="12" y2="19"/></svg>'
    ) + '<span>' + (isHardcover ? 'Tapa dura' : 'Tapa blanda') + '</span>';
    bindingEl.hidden = false;
  }

  // ---- Aviso de stock (opcional; ver window.stockInfo en js/books-data.js) ----
  var stockEl = document.getElementById('productStock');
  var stock = window.stockInfo ? window.stockInfo(book) : null;
  var agotado = !!(stock && stock.estado === 'agotado');
  if (stockEl) {
    if (stock && stock.texto) {
      stockEl.textContent = stock.texto;
      stockEl.className = 'stock-badge stock-badge--' + stock.estado;
      stockEl.hidden = false;
    } else {
      stockEl.hidden = true;
    }
  }

  // ---- Botón "Añadir al carrito" (la lógica de añadir vive en cart.js) ----
  var addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.dataset.id = book.id;
    addBtn.dataset.title = book.title;
    addBtn.dataset.author = book.author;
    addBtn.dataset.price = comingSoon ? 0 : book.price;
    addBtn.dataset.format = book.format;
    addBtn.dataset.cover = book.cover;
    if (comingSoon) {
      addBtn.disabled = true;
      addBtn.textContent = 'Disponible próximamente';
    } else if (agotado) {
      addBtn.disabled = true;
      addBtn.textContent = 'Agotado';
    }
  }

  // ---- Etiquetas "¿Qué busca tu alma hoy?" bajo la descripción -----------
  // Ayudan al cliente a seguir explorando desde su propia necesidad, que es
  // como suele buscar de verdad ("algo que dé paz", "algo para regalar").
  (function pintarEtiquetasDeNecesidad() {
    var desc = document.getElementById('productDesc');
    if (!desc || !Array.isArray(book.needs) || !book.needs.length || !window.NEED_BY_SLUG) return;
    var wrap = document.createElement('p');
    wrap.className = 'need-tags';
    wrap.innerHTML = '<span class="need-tags-label">Ideal si buscas:</span> ' +
      book.needs.map(function (n) {
        var need = window.NEED_BY_SLUG[n];
        if (!need) return '';
        return '<a class="need-tag" href="categoria.html?need=' + encodeURIComponent(n) + '" title="' +
          escapeHTML(need.desc) + '">' + escapeHTML(need.label) + '</a>';
      }).join('');
    desc.insertAdjacentElement('afterend', wrap);
  })();

  // ==========================================================================
  // Selector de portada — mismo libro, distintos diseños de cubierta
  // --------------------------------------------------------------------------
  // Si el libro tiene varias portadas (campo "covers" en js/books-data.js),
  // aquí se pinta un selector con la miniatura de cada diseño, su nombre y
  // una explicación corta del estilo. El precio es el mismo en todas, así
  // que solo cambia la imagen y la portada que se guarda en el pedido
  // ("Tapa blanda … · Portada ilustrada"), para saber cuál hay que enviar.
  // ==========================================================================
  function applyCover(i) {
    coverIndex = (i + covers.length) % covers.length;
    var cover = covers[coverIndex];

    if (coverImg) {
      coverImg.onerror = function () { coverImg.onerror = null; coverImg.src = cover.file; };
      coverImg.src = toWebp(cover.file);
      coverImg.alt = 'Portada de «' + book.title + '», de ' + book.author +
        (covers.length > 1 ? ' — ' + cover.short.toLowerCase() : '');
    }
    if (addBtn) {
      addBtn.dataset.cover = cover.file;
      addBtn.dataset.coverStyle = cover.style;
      // El formato es lo que identifica la línea del carrito y lo que se
      // ve en el pedido: al añadirle la portada elegida, dos portadas del
      // mismo libro se pueden pedir a la vez como líneas distintas.
      addBtn.dataset.format = covers.length > 1 ? book.format + ' · ' + cover.short : book.format;
    }
    var options = document.querySelectorAll('.cover-option');
    Array.prototype.slice.call(options).forEach(function (opt, idx) {
      opt.classList.toggle('is-active', idx === coverIndex);
      opt.setAttribute('aria-checked', idx === coverIndex ? 'true' : 'false');
      opt.tabIndex = idx === coverIndex ? 0 : -1;
    });
    var chosenEl = document.getElementById('coverChosenDesc');
    if (chosenEl) chosenEl.textContent = cover.desc || '';
  }

  if (covers.length > 1) {
    var gallery = document.querySelector('.product-gallery');
    if (gallery) {
      var picker = document.createElement('div');
      picker.className = 'cover-picker';
      picker.innerHTML =
        '<p class="cover-picker-title">Elige el diseño de portada' +
          '<span class="cover-picker-hint">Mismo libro y mismo precio · tú eliges la cubierta</span>' +
        '</p>' +
        '<div class="cover-options" role="radiogroup" aria-label="Diseño de portada">' +
          covers.map(function (c, i) {
            return '<button type="button" class="cover-option' + (i === 0 ? ' is-active' : '') + '" role="radio" ' +
              'aria-checked="' + (i === 0 ? 'true' : 'false') + '" data-cover-index="' + i + '">' +
              '<img src="' + toWebp(c.file) + '" data-fallback="' + c.file + '" ' +
              'onerror="this.onerror=null;this.src=this.getAttribute(\'data-fallback\')" ' +
              'alt="' + escapeHTML(c.short) + ' de «' + escapeHTML(book.title) + '»" loading="lazy" decoding="async">' +
              '<span class="cover-option-text">' +
                '<span class="cover-option-label">' + escapeHTML(c.label) + '</span>' +
                '<span class="cover-option-desc">' + escapeHTML(c.desc) + '</span>' +
              '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<p class="cover-chosen-desc" id="coverChosenDesc"></p>';
      gallery.appendChild(picker);

      Array.prototype.slice.call(picker.querySelectorAll('.cover-option')).forEach(function (btn) {
        btn.addEventListener('click', function () {
          applyCover(parseInt(btn.dataset.coverIndex, 10) || 0);
        });
        btn.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); applyCover(coverIndex + 1); document.querySelectorAll('.cover-option')[coverIndex].focus(); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); applyCover(coverIndex - 1); document.querySelectorAll('.cover-option')[coverIndex].focus(); }
        });
      });
    }
  }
  applyCover(0);

  // ---- Aviso de "próximamente" debajo del precio ----
  if (comingSoon) {
    var infoBlock = document.querySelector('[data-product-block]');
    var actionsEl = document.querySelector('.product-actions');
    if (infoBlock && actionsEl) {
      var soonNotice = document.createElement('p');
      soonNotice.className = 'coming-soon-notice';
      soonNotice.innerHTML =
        '<strong>Edición en preparación.</strong> Este título estará disponible muy pronto en nuestra librería. ' +
        'Añádelo a tu lista de deseos y lo tendrás a mano en cuanto podamos confirmar precio y fecha de envío.';
      infoBlock.insertBefore(soonNotice, actionsEl);
    }
    var qtyStepper = document.querySelector('[data-product-block] .qty-stepper');
    if (qtyStepper) {
      Array.prototype.slice.call(qtyStepper.querySelectorAll('button, input')).forEach(function (el) { el.disabled = true; });
    }
    var buyNow = document.querySelector('.product-actions a.btn--outline');
    if (buyNow) {
      buyNow.classList.add('is-disabled-link');
      buyNow.setAttribute('aria-disabled', 'true');
      buyNow.addEventListener('click', function (e) { e.preventDefault(); });
    }
  }
  var buyNowLink = document.querySelector('.product-actions a.btn--outline');
  if (agotado && buyNowLink) {
    buyNowLink.classList.add('is-disabled-link');
    buyNowLink.setAttribute('aria-disabled', 'true');
    buyNowLink.addEventListener('click', function (e) { e.preventDefault(); });
  }
  var qtyBlockEl = document.querySelector('[data-product-block] .qty-stepper');
  if (agotado && qtyBlockEl) {
    qtyBlockEl.querySelectorAll('button, input').forEach(function (el) { el.disabled = true; });
  }

  // ---- Botón de lista de deseos (la lógica vive en wishlist.js) ----
  var favBtn = document.getElementById('productFavBtn');
  if (favBtn) favBtn.dataset.id = book.id;

  // ---- Contador de cantidad ----
  var block = document.querySelector('[data-product-block]');
  if (block) {
    var qtyInput = block.querySelector('[data-qty-input]');
    var dec = block.querySelector('[data-qty-decrease]');
    var inc = block.querySelector('[data-qty-increase]');
    if (qtyInput && dec && inc) {
      dec.addEventListener('click', function () {
        qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
      });
      inc.addEventListener('click', function () {
        qtyInput.value = Math.min(20, (parseInt(qtyInput.value, 10) || 1) + 1);
      });
    }
  }

  // ---- Pestañas ----
  var tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabButtons.forEach(function (b) { b.classList.remove('is-active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var panel = document.querySelector('[data-tab-panel="' + btn.dataset.tab + '"]');
      if (panel) panel.classList.add('is-active');
    });
  });

  // ---- Productos relacionados (misma categoría) ----
  var relatedSection = document.getElementById('relatedSection');
  var relatedGrid = document.getElementById('relatedGrid');
  var related = window.BooksCatalog.related(book, 4);
  if (related.length && relatedSection && relatedGrid) {
    relatedGrid.innerHTML = related.map(function (b) {
      return (
        '<article class="book-card" data-product-id="' + b.id + '">' +
          '<a href="producto.html?id=' + b.id + '" class="book-cover book-cover--photo">' +
            '<img src="' + toWebp(b.cover) + '" onerror="this.onerror=null;this.src=\'' + b.cover + '\'" alt="Portada de «' + escapeHTML(b.title) + '», de ' + escapeHTML(b.author) + '" loading="lazy" decoding="async">' +
          '</a>' +
          '<div class="book-info">' +
            '<span class="book-category">' + escapeHTML(b.categoryLabel) + '</span>' +
            '<h3 class="book-title"><a href="producto.html?id=' + b.id + '">' + escapeHTML(b.title) + '</a></h3>' +
            '<p class="book-author">' + escapeHTML(b.author) + '</p>' +
            '<div class="book-footer">' +
              '<span class="book-price">' + fmtPrice(b.price) + '&nbsp;€<small>' + escapeHTML(b.priceNote) + '</small></span>' +
              '<button class="btn btn--primary btn--sm">Añadir</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
    relatedSection.hidden = false;
    document.dispatchEvent(new CustomEvent('catalog:rendered'));
  }

  // ==========================================================================
  // Vistos recientemente — historial local (localStorage), sin backend.
  // Guarda hasta 12 ids y muestra hasta 4, excluyendo el libro actual.
  // ==========================================================================
  (function recentlyViewed() {
    var STORAGE_KEY = 'fundamento_recent';
    var recentSection = document.getElementById('recentSection');
    var recentGrid = document.getElementById('recentGrid');

    var ids = [];
    try { ids = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { ids = []; }

    // Pinta la sección con lo que había guardado ANTES de visitar este libro.
    if (recentSection && recentGrid) {
      var toShow = ids.filter(function (id) { return id !== book.id; })
        .map(function (id) { return window.BooksCatalog.getById(id); })
        .filter(Boolean)
        .slice(0, 4);

      if (toShow.length) {
        recentGrid.innerHTML = toShow.map(function (b) {
          return (
            '<article class="book-card" data-product-id="' + b.id + '">' +
              '<a href="producto.html?id=' + b.id + '" class="book-cover book-cover--photo">' +
                '<img src="' + toWebp(b.cover) + '" onerror="this.onerror=null;this.src=\'' + b.cover + '\'" alt="Portada de «' + escapeHTML(b.title) + '», de ' + escapeHTML(b.author) + '" loading="lazy" decoding="async">' +
              '</a>' +
              '<div class="book-info">' +
                '<span class="book-category">' + escapeHTML(b.categoryLabel) + '</span>' +
                '<h3 class="book-title"><a href="producto.html?id=' + b.id + '">' + escapeHTML(b.title) + '</a></h3>' +
                '<p class="book-author">' + escapeHTML(b.author) + '</p>' +
                '<div class="book-footer">' +
                  '<span class="book-price">' + fmtPrice(b.price) + '&nbsp;€<small>' + escapeHTML(b.priceNote) + '</small></span>' +
                  '<button class="btn btn--primary btn--sm">Añadir</button>' +
                '</div>' +
              '</div>' +
            '</article>'
          );
        }).join('');
        recentSection.hidden = false;
        document.dispatchEvent(new CustomEvent('catalog:rendered'));
      }
    }

    // Ahora sí, actualiza el historial con el libro actual en primer lugar.
    ids = [book.id].concat(ids.filter(function (id) { return id !== book.id; })).slice(0, 12);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (e) {}
  })();

  // ==========================================================================
  // Opiniones (reseñas) — colección Firestore "resenas"
  // ==========================================================================
  var reviewsList = document.getElementById('reviewsList');
  var reviewsEmpty = document.getElementById('reviewsEmpty');
  var reviewSummary = document.getElementById('reviewSummary');
  var reviewLoginNotice = document.getElementById('reviewLoginNotice');
  var reviewForm = document.getElementById('reviewForm');
  var tabReviewCount = document.getElementById('tabReviewCount');
  var currentRating = 0;

  function starString(value) {
    var full = Math.round(value);
    return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
  }

  function reviewCardHTML(r) {
    var fecha = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleDateString('es-ES') : '';
    return (
      '<article class="review-card">' +
        '<div class="review-card-head">' +
          '<span class="review-author">' + escapeHTML(r.nombre || 'Cliente') + '</span>' +
          '<span class="stars" aria-hidden="true">' + starString(r.valoracion || 0) + '</span>' +
        '</div>' +
        '<p class="review-date">' + fecha + '</p>' +
        '<p class="review-comment">' + escapeHTML(r.comentario || '') + '</p>' +
      '</article>'
    );
  }

  function renderReviews(reseñas) {
    reseñas.sort(function (a, b) {
      var ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
      var tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
      return tb - ta;
    });

    if (reviewsList) reviewsList.innerHTML = reseñas.map(reviewCardHTML).join('');
    if (reviewsEmpty) reviewsEmpty.hidden = reseñas.length > 0;

    if (tabReviewCount) tabReviewCount.textContent = reseñas.length ? '(' + reseñas.length + ')' : '';

    var count = reseñas.length;
    var avg = count ? reseñas.reduce(function (s, r) { return s + (r.valoracion || 0); }, 0) / count : 0;

    if (reviewSummary) reviewSummary.hidden = count === 0;
    var avgValueEl = document.getElementById('reviewAvgValue');
    var avgStarsEl = document.getElementById('reviewAvgStars');
    var avgCountEl = document.getElementById('reviewAvgCount');
    if (avgValueEl) avgValueEl.textContent = avg.toFixed(1).replace('.', ',');
    if (avgStarsEl) avgStarsEl.textContent = starString(avg);
    if (avgCountEl) avgCountEl.textContent = count + (count === 1 ? ' valoración' : ' valoraciones');

    var productRating = document.getElementById('productRating');
    if (productRating) {
      productRating.hidden = count === 0;
      var stars = document.getElementById('productStars');
      var ratingCount = document.getElementById('productRatingCount');
      if (stars) stars.textContent = starString(avg);
      if (ratingCount) ratingCount.textContent = avg.toFixed(1).replace('.', ',') + ' · ' + count + (count === 1 ? ' valoración' : ' valoraciones');
    }

    injectProductJsonLd(count, avg);
  }

  function loadReviews() {
    if (!window.fbDb) return;
    window.fbDb.collection('resenas').where('productId', '==', book.id).get()
      .then(function (snapshot) {
        var reseñas = [];
        snapshot.forEach(function (doc) { reseñas.push(doc.data()); });
        renderReviews(reseñas);
      })
      .catch(function (err) { console.error('Error al cargar las opiniones', err); });
  }
  loadReviews();

  // ---- Selector de estrellas del formulario ----
  var starBtns = document.querySelectorAll('.review-star-btn');
  var ratingInput = document.getElementById('reviewRatingInput');
  function paintStars(value) {
    starBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', parseInt(btn.dataset.star, 10) <= value);
    });
  }
  starBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentRating = parseInt(btn.dataset.star, 10);
      if (ratingInput) ratingInput.value = currentRating;
      paintStars(currentRating);
    });
  });

  // ---- Alternar formulario / aviso de inicio de sesión según sesión ----
  function refreshReviewFormVisibility(user) {
    if (reviewForm) reviewForm.hidden = !user;
    if (reviewLoginNotice) reviewLoginNotice.hidden = !!user;
  }
  if (window.fbAuth) {
    window.fbAuth.onAuthStateChanged(refreshReviewFormVisibility);
  } else {
    refreshReviewFormVisibility(null);
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var errorEl = document.getElementById('reviewError');
      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      var comentario = document.getElementById('reviewComment').value.trim();
      if (errorEl) errorEl.hidden = true;

      if (!user) return;
      if (currentRating < 1) {
        if (errorEl) { errorEl.textContent = 'Elige una valoración de 1 a 5 estrellas.'; errorEl.hidden = false; }
        return;
      }
      if (!comentario) {
        if (errorEl) { errorEl.textContent = 'Escribe un breve comentario.'; errorEl.hidden = false; }
        return;
      }

      var submitBtn = reviewForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      window.fbDb.collection('resenas').add({
        productId: book.id,
        uid: user.uid,
        nombre: user.displayName || 'Cliente',
        valoracion: currentRating,
        comentario: comentario,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function () {
        reviewForm.reset();
        currentRating = 0;
        if (ratingInput) ratingInput.value = 0;
        paintStars(0);
        loadReviews();
      }).catch(function (err) {
        if (errorEl) { errorEl.textContent = 'No se pudo publicar tu opinión. Inténtalo de nuevo.'; errorEl.hidden = false; }
        console.error('Error al publicar la opinión', err);
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  // ---- JSON-LD del producto (con valoración media real si existen opiniones) ----
  function injectProductJsonLd(count, avg) {
    var data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: book.title,
      image: 'https://www.libreriatumayortesoro.com/' + book.cover,
      description: book.description,
      brand: { '@type': 'Brand', name: book.author },
      offers: {
        '@type': 'Offer',
        url: 'https://www.libreriatumayortesoro.com/producto.html?id=' + book.id,
        priceCurrency: 'EUR',
        price: String(book.price),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'Librería tu mayor tesoro' }
      }
    };
    // Sin precio confirmado no se publica ninguna oferta: Google marcaría
    // el dato estructurado como incompleto.
    if (comingSoon) delete data.offers;
    if (count > 0) {
      data.aggregateRating = { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: count };
    }
    var existing = document.getElementById('productJsonLd');
    if (existing) existing.remove();
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'productJsonLd';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
})();
