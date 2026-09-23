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
    profecia: 'Profecía', devocionales: 'Devocionales', 'vida-cristiana': 'Vida cristiana',
    infantil: 'Infantil y juvenil', doctrina: 'Doctrina y creencias', regalos: 'Regalos y papelería'
  };

  function fmtPrice(n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var params = new URLSearchParams(window.location.search);

  // ---- Fichas antiguas fusionadas (misma obra, "... Tapa dura" o
  // "... Tapa blanda" como producto aparte) → redirigen a la ficha única,
  // ya con esa tapa seleccionada en el configurador. Así ningún enlace
  // antiguo (compartido, guardado en favoritos, etc.) se rompe.
  var requestedId = params.get('id');
  var merged = window.EW_MERGED_REDIRECTS && window.EW_MERGED_REDIRECTS[requestedId];
  if (merged) {
    var redirectParams = new URLSearchParams(window.location.search);
    redirectParams.set('id', merged.id);
    redirectParams.set('tipo', merged.tipo);
    window.location.replace('producto.html?' + redirectParams.toString());
    return;
  }

  var book = window.BooksCatalog.getById(requestedId);

  if (!book) {
    var notFound = document.getElementById('productNotFound');
    if (notFound) notFound.hidden = false;
    return;
  }

  layout.hidden = false;

  // ---- Configurador de impresión (colección Elena G. White) --------------
  // Si este libro tiene tabla de precios de 24BookPrint (js/ew-pricing.js),
  // el cliente puede elegir tapa, tamaño, acabado y papel, y el precio se
  // recalcula al momento. Empieza siempre con la combinación que YA está
  // publicada para este libro (mismo precio de siempre); si el cliente
  // cambia algo, se usa el precio de la tabla del proveedor + 1 €.
  var hasPrintOpts = !!(window.hasEWPrintOptions && window.hasEWPrintOptions(book.id));
  var ewDef = hasPrintOpts ? window.EW_BOOK_DEFAULTS[book.id] : null;
  var poState = hasPrintOpts ? { tipo: ewDef.tipo, tamano: ewDef.tamano, acabado: ewDef.acabado, papel: ewDef.papel } : null;
  var PAPER_LABELS_FULL = { crema: 'Papel crema', offset: 'Papel blanco (Offset)', semi: 'Papel blanco semi brillante' };

  function poFormatLabel(state) {
    var sizes = (window.EW_SIZES_BY_TIPO && window.EW_SIZES_BY_TIPO[state.tipo]) || [];
    var sizeInfo = sizes.filter(function (s) { return s.slug === state.tamano; })[0];
    var tipoLabel = state.tipo === 'dura' ? 'Tapa dura' : 'Tapa blanda';
    var sizePart = sizeInfo ? (sizeInfo.label + ' (' + sizeInfo.dims + ')') : '';
    var acabadoLabel = state.acabado === 'mate' ? 'Mate' : 'Brillo';
    var papelLabel = PAPER_LABELS_FULL[state.papel] || '';
    return tipoLabel + (sizePart ? ', ' + sizePart : '') + ' · ' + acabadoLabel + ' · ' + papelLabel;
  }

  // Si el cliente llega desde el catálogo habiendo pulsado "Tapa dura" o
  // "Tapa blanda" en la propia tarjeta del libro (antes de entrar a la
  // ficha), se abre ya con ese tipo elegido — ver el botón añadido en
  // js/shop.js debajo de la portada de cada tarjeta.
  if (hasPrintOpts) {
    var tipoParam = params.get('tipo');
    if ((tipoParam === 'dura' || tipoParam === 'blanda') && tipoParam !== poState.tipo) {
      poState.tipo = tipoParam;
      var sizesForTipo = window.EW_SIZES_BY_TIPO[tipoParam] || [];
      if (!sizesForTipo.some(function (s) { return s.slug === poState.tamano; })) {
        poState.tamano = tipoParam === 'dura' ? 'mediano' : 'a5';
      }
    }
  }

  // ¿Libro anunciado pero todavía sin precio? (campo "comingSoon" del
  // catálogo). En ese caso se muestra la portada y un aviso de próxima
  // disponibilidad, pero no se puede comprar.
  var comingSoon = window.isComingSoon ? window.isComingSoon(book) : false;

  // Portadas disponibles de este mismo libro (1 o varias).
  var covers = window.bookCovers ? window.bookCovers(book) : [{ style: 'ilustrada', file: book.cover, label: 'Estándar', short: 'Portada estándar', desc: '' }];
  var coverIndex = 0;

  // ---- SEO: título, meta descripción, OG/Twitter, canonical, migas de pan ----
  var pageTitle = book.title + ' (' + book.author + ') — Comprar | Librería tu mayor tesoro';
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
    var bindingLabel = hasPrintOpts
      ? (poState.tipo === 'dura' ? 'Tapa dura' : 'Tapa blanda')
      : { 'tapa-dura': 'Tapa dura', rustica: 'Tapa blanda' }[book.formatSlug];
    var specRows = [];
    if (bindingLabel) specRows.push(['Encuadernación', bindingLabel, false, 'encuadernacion']);
    var finishVal = hasPrintOpts ? (poState.acabado === 'mate' ? 'Mate' : 'Brillo') : book.finish;
    if (finishVal) specRows.push(['Acabado de cubierta', finishVal, false, 'acabado']);
    var paperVal = hasPrintOpts ? PAPER_LABELS_FULL[poState.papel] : book.paper;
    if (paperVal) specRows.push(['Tipo de papel', paperVal, false, 'papel']);
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
    var formatVal = hasPrintOpts ? poFormatLabel(poState) : book.format;
    specRows.push(['Formato', formatVal, false, 'formato']);
    specRows.push(['Categoría', book.categoryLabel]);
    specRows.push(['Autor', book.author]);
    specRows.push(['Idioma', book.idioma]);
    specList.innerHTML = specRows
      .map(function (row) {
        // El tercer elemento (opcional) indica que el valor ya viene como
        // HTML seguro creado aquí arriba (enlaces), no como texto plano.
        var valor = row[2] ? row[1] : escapeHTML(row[1]);
        var keyAttr = row[3] ? ' data-spec-key="' + row[3] + '"' : '';
        return '<li' + keyAttr + '><span>' + escapeHTML(row[0]) + '</span><span>' + valor + '</span></li>';
      }).join('');
  }

  // Actualiza una fila concreta de la ficha técnica (usado por el
  // configurador de impresión al cambiar tamaño/acabado/papel/tipo).
  function setSpecRow(key, value) {
    if (!specList) return;
    var li = specList.querySelector('li[data-spec-key="' + key + '"] span:last-child');
    if (li) li.textContent = value;
  }

  // ---- Sello de encuadernación sobre la portada (tapa dura / tapa blanda) ----
  var bindingEl = document.getElementById('productBinding');
  function renderBindingTag(isHardcover) {
    if (!bindingEl) return;
    bindingEl.className = 'binding-tag binding-tag--' + (isHardcover ? 'tapa-dura' : 'rustica');
    bindingEl.innerHTML = (isHardcover
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 4v13a3 3 0 0 0 3 3h13"/><line x1="8" y1="8" x2="15" y2="8"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5S5 4 12 6c7-2 10-0.5 10-0.5v13S19 17 12 19c-7-2-10-0.5-10-0.5z"/><line x1="12" y1="6" x2="12" y2="19"/></svg>'
    ) + '<span>' + (isHardcover ? 'Tapa dura' : 'Tapa blanda') + '</span>';
    bindingEl.hidden = false;
  }
  if (bindingEl) {
    renderBindingTag(hasPrintOpts ? poState.tipo === 'dura' : book.formatSlug === 'tapa-dura');
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

  // Si se llega desde el carrito (o un enlace) con "?portada=<estilo>", la ficha
  // se abre ya con esa portada seleccionada.
  (function () {
    var wanted = params.get('portada');
    if (!wanted) return;
    for (var i = 0; i < covers.length; i++) {
      if (covers[i].style === wanted) { applyCover(i); break; }
    }
  })();

  // ==========================================================================
  // Configurador de impresión — tapa, tamaño, acabado y papel
  // --------------------------------------------------------------------------
  // Solo aparece en los libros de la colección Elena G. White que tienen
  // tabla de precios del proveedor (window.EW_BOOK_DEFAULTS, generado a
  // partir de precios_libros_elena_white.pdf — ver js/ew-pricing.js).
  // Empieza siempre con la combinación que ya está publicada (mismo precio
  // de siempre) y, si el cliente cambia algo, usa el precio del PDF + 1 €.
  // ==========================================================================
  if (hasPrintOpts && !comingSoon) {
    var PAPER_SHORT = { crema: 'Crema', offset: 'Blanco Offset', semi: 'Blanco semi brillo' };
    var poRoot = document.createElement('div');
    poRoot.className = 'print-options';
    poRoot.id = 'printOptions';

    // El configurador empieza siempre plegado (solo se ve el resumen y el
    // botón "Cambiar edición"): así no tapa el botón de añadir al carrito.
    var poExpanded = false;

    // ---- Ventana emergente con un ejemplo de cada tipo de papel --------
    var PAPER_INFO = {
      crema: {
        label: 'Papel crema',
        tagline: 'Tono marfil, cálido y de bajo brillo',
        desc: 'Papel de color crudo/marfil, algo más oscuro que el blanco. Al tener menos contraste y brillo, resulta más suave para la vista en lecturas largas y da al libro un aspecto más clásico.',
        tone: '#efe5cf'
      },
      offset: {
        label: 'Papel blanco (Offset)',
        tagline: 'Blanco natural, sin apenas brillo',
        desc: 'Papel blanco estándar de imprenta, prácticamente sin brillo. Es la opción más habitual en libros de texto: buen contraste con la tinta y un tacto ligeramente mate.',
        tone: '#fbfaf5'
      },
      semi: {
        label: 'Papel blanco semi brillante',
        tagline: 'Blanco con un ligero brillo satinado',
        desc: 'Papel blanco con un acabado algo más satinado que el offset. Aporta más nitidez a texto e ilustraciones, con un brillo suave al inclinar la página hacia la luz.',
        tone: '#ffffff'
      }
    };

    function ensurePaperLightbox() {
      var lb = document.getElementById('paperLightbox');
      if (lb) return lb;
      lb = document.createElement('div');
      lb.id = 'paperLightbox';
      lb.className = 'paper-lightbox';
      lb.innerHTML =
        '<div class="paper-lightbox-backdrop" data-paper-close></div>' +
        '<div class="paper-lightbox-panel" role="dialog" aria-modal="true" aria-label="Ejemplo de tipo de papel">' +
          '<button type="button" class="paper-lightbox-close" data-paper-close aria-label="Cerrar">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>' +
          '</button>' +
          '<div class="paper-lightbox-body" id="paperLightboxBody"></div>' +
        '</div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (e) {
        if (e.target.closest('[data-paper-close]')) closePaperLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePaperLightbox();
      });
      return lb;
    }

    function closePaperLightbox() {
      var lb = document.getElementById('paperLightbox');
      if (lb) lb.classList.remove('is-open');
    }

    var paperLightboxOpenFor = null;
    function openPaperLightbox(slug) {
      var info = PAPER_INFO[slug];
      if (!info) return;
      var lb = ensurePaperLightbox();
      if (paperLightboxOpenFor !== slug) {
        var body = document.getElementById('paperLightboxBody');
        var shineClass = slug === 'semi' ? ' paper-preview--shine' : '';
        body.innerHTML =
          '<div class="paper-preview' + shineClass + '" style="background:' + info.tone + ';">' +
            '<div class="paper-preview-lines">' +
              '<span class="paper-preview-title">Aa</span>' +
              '<span class="paper-preview-line"></span>' +
              '<span class="paper-preview-line"></span>' +
              '<span class="paper-preview-line short"></span>' +
            '</div>' +
          '</div>' +
          '<p class="paper-lightbox-title">' + escapeHTML(info.label) + '</p>' +
          '<p class="paper-lightbox-tagline">' + escapeHTML(info.tagline) + '</p>' +
          '<p class="paper-lightbox-desc">' + escapeHTML(info.desc) + '</p>';
        paperLightboxOpenFor = slug;
      }
      lb.classList.add('is-open');
    }

    function poGroupHTML(label, required, rowClass, rowId, innerHTML) {
      return '<div class="po-group">' +
        '<span class="po-label">' + escapeHTML(label) + (required ? ' <em>*</em>' : '') + '</span>' +
        '<div class="po-row' + (rowClass ? ' ' + rowClass : '') + '"' + (rowId ? ' id="' + rowId + '"' : '') + ' role="radiogroup" aria-label="' + escapeHTML(label) + '">' +
          innerHTML +
        '</div>' +
      '</div>';
    }

    function poCardHTML(po, value, active, title, subtitle, disabled) {
      return '<button type="button" class="po-card' + (active ? ' is-active' : '') + (disabled ? ' is-disabled' : '') +
        '" role="radio" aria-checked="' + (active ? 'true' : 'false') + '" data-po="' + po + '" data-value="' + value + '"' +
        (disabled ? ' disabled' : '') + '>' +
        '<span class="po-card-text"><strong>' + escapeHTML(title) + '</strong>' + (subtitle ? '<small>' + escapeHTML(subtitle) + '</small>' : '') + '</span>' +
        '<svg class="po-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>' +
      '</button>';
    }

    function poPillHTML(po, value, active, label) {
      return '<button type="button" class="po-pill' + (active ? ' is-active' : '') +
        '" role="radio" aria-checked="' + (active ? 'true' : 'false') + '" data-po="' + po + '" data-value="' + value + '">' +
        escapeHTML(label) + '</button>';
    }

    function sizeRowHTML(tipo, tamano) {
      var sizes = window.EW_SIZES_BY_TIPO[tipo] || [];
      return sizes.map(function (s) {
        return poCardHTML('tamano', s.slug, s.slug === tamano, s.label, s.dims);
      }).join('');
    }

    function buildHTML() {
      var tipoRow =
        poCardHTML('tipo', 'blanda', poState.tipo === 'blanda', 'Tapa blanda', 'Libro estándar') +
        poCardHTML('tipo', 'dura', poState.tipo === 'dura', 'Tapa dura', 'Libro en tapa dura');

      var finishRow =
        poPillHTML('acabado', 'mate', poState.acabado === 'mate', 'Mate') +
        poPillHTML('acabado', 'brillo', poState.acabado === 'brillo', 'Brillo');

      var paperRow = window.EW_PAPERS.map(function (p) {
        return '<span class="po-card-wrap">' +
          poCardHTML('papel', p.slug, p.slug === poState.papel, p.label, null) +
          '<button type="button" class="po-info-btn" data-paper-info="' + p.slug + '" aria-label="Ver ejemplo de ' + escapeHTML(p.label) + '" title="Ver ejemplo">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="11"/><circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none"/></svg>' +
          '</button>' +
        '</span>';
      }).join('');

      var colorRow =
        poCardHTML('color', 'bn', true, 'Blanco/negro', 'Interior del libro') +
        poCardHTML('color', 'color', false, 'Color', 'Próximamente', true);

      poRoot.innerHTML =
        '<div class="po-header">' +
          '<p class="print-options-title">Elige tu edición</p>' +
          '<button type="button" class="po-toggle" id="poToggle" aria-expanded="' + (poExpanded ? 'true' : 'false') + '" aria-controls="poBody">' +
            '<span class="po-toggle-text">' + (poExpanded ? 'Ocultar opciones' : 'Cambiar edición') + '</span>' +
            '<svg class="po-toggle-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</button>' +
        '</div>' +
        '<p class="po-summary" id="poSummary">' + escapeHTML(poFormatLabel(poState)) + '</p>' +
        '<div class="po-body" id="poBody">' +
          '<p class="print-options-hint">Por defecto: tapa blanda, A5, brillo y papel blanco offset. Cambia lo que necesites — el precio se ajusta al momento.</p>' +
          poGroupHTML('Tipo', true, 'po-row--tipo', null, tipoRow) +
          poGroupHTML('Tamaño', true, 'po-row--tamano', 'poSizeRow', sizeRowHTML(poState.tipo, poState.tamano)) +
          poGroupHTML('Acabado de la cubierta', true, 'po-row--pill', null, finishRow) +
          (poState.tipo === 'dura' ? '<p class="po-note">El acabado no cambia el precio en tapa dura.</p>' : '') +
          poGroupHTML('Tipo de papel', true, 'po-row--papel', null, paperRow) +
          poGroupHTML('Color de interior', true, 'po-row--color', null, colorRow) +
          '<p class="po-note po-note--muted">La impresión a color de interior todavía no está disponible; de momento todos los libros se imprimen en blanco y negro.</p>' +
        '</div>';
      poRoot.classList.toggle('is-collapsed', !poExpanded);
    }

    function updatePrice() {
      var price = window.getEWPrice(book.id, poState.tipo, poState.tamano, poState.acabado, poState.papel);
      if (price === null) price = book.price;
      priceEl.childNodes[0].textContent = fmtPrice(price) + '\u00A0€ ';
      priceNoteEl.textContent = book.priceNote;

      var formatStr = poFormatLabel(poState);
      if (addBtn) {
        addBtn.dataset.price = price;
        addBtn.dataset.format = formatStr;
        addBtn.dataset.imp = JSON.stringify(poState);
      }
      setSpecRow('encuadernacion', poState.tipo === 'dura' ? 'Tapa dura' : 'Tapa blanda');
      setSpecRow('acabado', poState.acabado === 'mate' ? 'Mate' : 'Brillo');
      setSpecRow('papel', PAPER_LABELS_FULL[poState.papel]);
      setSpecRow('formato', formatStr);
      renderBindingTag(poState.tipo === 'dura');
      var summaryEl = poRoot.querySelector('#poSummary');
      if (summaryEl) summaryEl.textContent = formatStr;
    }

    poRoot.addEventListener('mouseover', function (e) {
      var infoBtn = e.target.closest('.po-info-btn');
      if (infoBtn) openPaperLightbox(infoBtn.dataset.paperInfo);
    });

    poRoot.addEventListener('click', function (e) {
      var toggleBtn = e.target.closest('.po-toggle');
      if (toggleBtn) {
        poExpanded = !poExpanded;
        poRoot.classList.toggle('is-collapsed', !poExpanded);
        toggleBtn.setAttribute('aria-expanded', poExpanded ? 'true' : 'false');
        var toggleText = toggleBtn.querySelector('.po-toggle-text');
        if (toggleText) toggleText.textContent = poExpanded ? 'Ocultar opciones' : 'Cambiar edición';
        return;
      }
      var infoBtn = e.target.closest('.po-info-btn');
      if (infoBtn) {
        openPaperLightbox(infoBtn.dataset.paperInfo);
        return;
      }
      var btn = e.target.closest('.po-card, .po-pill');
      if (!btn || btn.disabled) return;
      var po = btn.dataset.po;
      var value = btn.dataset.value;
      if (po === 'color') return; // única opción disponible por ahora
      if (po === 'tipo') {
        poState.tipo = value;
        var sizesForTipo = window.EW_SIZES_BY_TIPO[value] || [];
        if (!sizesForTipo.some(function (s) { return s.slug === poState.tamano; })) {
          poState.tamano = value === 'dura' ? 'mediano' : 'a5';
        }
        buildHTML();
      } else {
        poState[po] = value;
        // Actualiza solo el grupo tocado para no perder el foco del resto.
        var group = btn.closest('.po-row');
        Array.prototype.slice.call(group.querySelectorAll('.po-card, .po-pill')).forEach(function (b) {
          var active = b.dataset.value === value;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-checked', active ? 'true' : 'false');
        });
      }
      updatePrice();
    });

    buildHTML();
    updatePrice();

    var actionsBlock = document.querySelector('.product-actions');
    if (actionsBlock) actionsBlock.parentNode.insertBefore(poRoot, actionsBlock);
  }

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

  // Si se llega con #opiniones en la URL (p. ej. desde el aviso de "Mis
  // pedidos" invitando a valorar), abre esa pestaña directamente.
  if (window.location.hash === '#opiniones') {
    var tabOpinionesInicial = document.querySelector('.tab-btn[data-tab="opiniones"]');
    if (tabOpinionesInicial) {
      tabOpinionesInicial.click();
      setTimeout(function () { tabOpinionesInicial.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
    }
  }

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
    var fotosHTML = '';
    if (Array.isArray(r.fotos) && r.fotos.length) {
      fotosHTML = '<div class="review-photos-grid">' + r.fotos.map(function (url) {
        return '<a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="Foto añadida por quien opina" loading="lazy"></a>';
      }).join('') + '</div>';
    }
    var utilesCount = typeof r.utilesCount === 'number' && r.utilesCount > 0 ? r.utilesCount : 0;
    return (
      '<article class="review-card">' +
        '<div class="review-card-head">' +
          '<span class="review-author">' + escapeHTML(r.nombre || 'Cliente') + '</span>' +
          '<span class="stars" aria-hidden="true">' + starString(r.valoracion || 0) + '</span>' +
        '</div>' +
        '<p class="review-date">' + fecha + '</p>' +
        '<p class="review-comment">' + escapeHTML(r.comentario || '') + '</p>' +
        fotosHTML +
        '<div class="review-card-foot">' +
          '<button type="button" class="review-useful-btn" data-resena-id="' + r._id + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h11.4a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 17 11h-4.5l1-4.5A1.5 1.5 0 0 0 12 5L7 11"/></svg>' +
            '<span>¿Te ha sido útil?</span>' +
            '<span class="review-useful-count">' + (utilesCount > 0 ? utilesCount : '') + '</span>' +
          '</button>' +
        '</div>' +
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
        snapshot.forEach(function (doc) {
          var d = doc.data();
          d._id = doc.id;
          reseñas.push(d);
        });
        renderReviews(reseñas);
        marcarUtilesDelUsuario();
      })
      .catch(function (err) { console.error('Error al cargar las opiniones', err); });
  }
  loadReviews();

  // ---- "¿Te ha sido útil?" — un voto por persona, guardado en la
  // subcolección resenas/{id}/utiles/{uid}. El contador (utilesCount) que
  // se ve en la tarjeta lo mantiene al día una Cloud Function; aquí solo
  // creamos o borramos nuestro propio voto y pintamos el botón al momento. ----
  function marcarUtilesDelUsuario() {
    var user = window.fbAuth ? window.fbAuth.currentUser : null;
    if (!user || !window.fbDb) return;
    document.querySelectorAll('.review-useful-btn').forEach(function (btn) {
      var resenaId = btn.dataset.resenaId;
      if (!resenaId) return;
      window.fbDb.collection('resenas').doc(resenaId).collection('utiles').doc(user.uid).get()
        .then(function (doc) { btn.classList.toggle('is-active', doc.exists); })
        .catch(function () {});
    });
  }

  if (reviewsList) {
    reviewsList.addEventListener('click', function (e) {
      var btn = e.target.closest('.review-useful-btn');
      if (!btn) return;
      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      if (!user) {
        var tabOpiniones = document.querySelector('.tab-btn[data-tab="opiniones"]');
        if (reviewLoginNotice) reviewLoginNotice.hidden = false;
        if (tabOpiniones) tabOpiniones.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      var resenaId = btn.dataset.resenaId;
      if (!resenaId || !window.fbDb) return;
      btn.disabled = true;
      var votoRef = window.fbDb.collection('resenas').doc(resenaId).collection('utiles').doc(user.uid);
      var countEl = btn.querySelector('.review-useful-count');
      var yaActivo = btn.classList.contains('is-active');

      var accion = yaActivo
        ? votoRef.delete()
        : votoRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() });

      accion.then(function () {
        btn.classList.toggle('is-active', !yaActivo);
        if (countEl) {
          var actual = parseInt(countEl.textContent, 10) || 0;
          var nuevo = Math.max(0, actual + (yaActivo ? -1 : 1));
          countEl.textContent = nuevo > 0 ? String(nuevo) : '';
        }
      }).catch(function (err) {
        console.error('No se pudo guardar el voto de "útil"', err);
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

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

  // ---- Fotos de la opinión (opcional, máx. 4) ----
  var reviewPhotosInput = document.getElementById('reviewPhotos');
  var reviewPhotosPreview = document.getElementById('reviewPhotosPreview');
  var MAX_FOTOS_RESENA = 4;
  var MAX_ENTRADA_RESENA = 8 * 1024 * 1024; // 8 MB por foto
  var fotosListas = []; // [{ blob, tipo, ext, previewUrl }]

  function comprimirFotoResena(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var LADO_MAX = 1600;
        var escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('No se ha podido procesar la imagen.'));
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No hemos podido leer esa imagen.')); };
      img.src = url;
    });
  }

  function pintarPreviewFotos() {
    if (!reviewPhotosPreview) return;
    reviewPhotosPreview.innerHTML = '';
    fotosListas.forEach(function (foto, i) {
      var div = document.createElement('div');
      div.className = 'review-photo-thumb';
      div.innerHTML = '<img src="' + foto.previewUrl + '" alt=""><button type="button" aria-label="Quitar foto">×</button>';
      div.querySelector('button').addEventListener('click', function () {
        URL.revokeObjectURL(foto.previewUrl);
        fotosListas.splice(i, 1);
        pintarPreviewFotos();
      });
      reviewPhotosPreview.appendChild(div);
    });
  }

  if (reviewPhotosInput) {
    reviewPhotosInput.addEventListener('change', function () {
      var errorEl = document.getElementById('reviewError');
      var archivos = Array.prototype.slice.call(reviewPhotosInput.files || []);
      reviewPhotosInput.value = '';
      archivos.forEach(function (file) {
        if (fotosListas.length >= MAX_FOTOS_RESENA) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
          if (errorEl) { errorEl.textContent = 'Las fotos tienen que ser JPG, PNG o WEBP.'; errorEl.hidden = false; }
          return;
        }
        if (file.size > MAX_ENTRADA_RESENA) {
          if (errorEl) { errorEl.textContent = 'Alguna foto pesa demasiado (máximo 8 MB).'; errorEl.hidden = false; }
          return;
        }
        comprimirFotoResena(file).then(function (blob) {
          fotosListas.push({ blob: blob, tipo: 'image/jpeg', ext: 'jpg', previewUrl: URL.createObjectURL(blob) });
          pintarPreviewFotos();
        }).catch(function (err) {
          if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; }
        });
      });
    });
  }

  function subirFotosResena(uid) {
    if (!fotosListas.length || !window.firebase || !firebase.storage) return Promise.resolve([]);
    var base = Date.now();
    var subidas = fotosListas.map(function (foto, i) {
      var ref = firebase.storage().ref().child('resenas/' + book.id + '/' + uid + '/' + base + '-' + i + '.' + foto.ext);
      return ref.put(foto.blob, { contentType: foto.tipo }).then(function () { return ref.getDownloadURL(); });
    });
    return Promise.all(subidas);
  }

  // ---- Alternar formulario / aviso de inicio de sesión según sesión ----
  function refreshReviewFormVisibility(user) {
    if (reviewForm) reviewForm.hidden = !user;
    if (reviewLoginNotice) reviewLoginNotice.hidden = !!user;
    if (user) marcarUtilesDelUsuario();
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
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publicando…'; }

      subirFotosResena(user.uid).then(function (fotosUrls) {
        var datos = {
          productId: book.id,
          uid: user.uid,
          nombre: user.displayName || 'Cliente',
          valoracion: currentRating,
          comentario: comentario,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (fotosUrls.length) datos.fotos = fotosUrls;
        return window.fbDb.collection('resenas').add(datos);
      }).then(function () {
        reviewForm.reset();
        currentRating = 0;
        if (ratingInput) ratingInput.value = 0;
        paintStars(0);
        fotosListas.forEach(function (f) { URL.revokeObjectURL(f.previewUrl); });
        fotosListas = [];
        pintarPreviewFotos();
        loadReviews();
      }).catch(function (err) {
        if (errorEl) { errorEl.textContent = 'No se pudo publicar tu opinión. Inténtalo de nuevo.'; errorEl.hidden = false; }
        console.error('Error al publicar la opinión', err);
      }).finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publicar opinión'; }
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

    // Dato estructurado adicional tipo Book (autor como Person, formato):
    // ayuda a que Google relacione la ficha con búsquedas del título exacto
    // y del nombre del autor, además del schema Product de arriba.
    var bookData = {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: book.title,
      image: 'https://www.libreriatumayortesoro.com/' + book.cover,
      description: book.description,
      inLanguage: lang,
      author: { '@type': 'Person', name: book.author },
      bookFormat: /tapa dura/i.test(book.format || '') ? 'https://schema.org/Hardcover' : 'https://schema.org/Paperback',
      publisher: { '@type': 'Organization', name: 'Librería tu mayor tesoro' },
      url: 'https://www.libreriatumayortesoro.com/producto.html?id=' + book.id
    };
    var existingBook = document.getElementById('bookJsonLd');
    if (existingBook) existingBook.remove();
    var bookScript = document.createElement('script');
    bookScript.type = 'application/ld+json';
    bookScript.id = 'bookJsonLd';
    bookScript.textContent = JSON.stringify(bookData);
    document.head.appendChild(bookScript);
  }
})();
