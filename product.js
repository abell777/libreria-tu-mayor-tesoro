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
  if (coverImg) { coverImg.src = book.cover; coverImg.alt = 'Portada de «' + book.title + '», de ' + book.author; }

  document.getElementById('productCategory').textContent = book.categoryLabel;
  document.getElementById('productTitle').textContent = book.title;
  document.getElementById('productAuthor').textContent = book.author;
  document.getElementById('productPrice').childNodes[0].textContent = fmtPrice(book.price) + '\u00A0€ ';
  document.getElementById('productPriceNote').textContent = book.priceNote;
  document.getElementById('productDesc').textContent = book.description;
  document.getElementById('productDescLong').textContent = book.description;

  var specList = document.getElementById('productSpecList');
  if (specList) {
    specList.innerHTML = [
      ['Categoría', book.categoryLabel],
      ['Autor', book.author],
      ['Formato', book.format],
      ['Idioma', book.idioma]
    ].map(function (row) { return '<li><span>' + row[0] + '</span><span>' + row[1] + '</span></li>'; }).join('');
  }

  // ---- Botón "Añadir al carrito" (la lógica de añadir vive en cart.js) ----
  var addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.dataset.id = book.id;
    addBtn.dataset.title = book.title;
    addBtn.dataset.author = book.author;
    addBtn.dataset.price = book.price;
    addBtn.dataset.format = book.format;
    addBtn.dataset.cover = book.cover;
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
        '<article class="book-card">' +
          '<a href="producto.html?id=' + b.id + '" class="book-cover book-cover--photo">' +
            '<img src="' + b.cover + '" alt="Portada de «' + b.title + '», de ' + b.author + '" loading="lazy">' +
          '</a>' +
          '<div class="book-info">' +
            '<span class="book-category">' + b.categoryLabel + '</span>' +
            '<h3 class="book-title"><a href="producto.html?id=' + b.id + '">' + b.title + '</a></h3>' +
            '<p class="book-author">' + b.author + '</p>' +
            '<div class="book-footer">' +
              '<span class="book-price">' + fmtPrice(b.price) + '&nbsp;€<small>' + b.priceNote + '</small></span>' +
              '<button class="btn btn--primary btn--sm">Añadir</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
    relatedSection.hidden = false;
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
            '<article class="book-card">' +
              '<a href="producto.html?id=' + b.id + '" class="book-cover book-cover--photo">' +
                '<img src="' + b.cover + '" alt="Portada de «' + escapeHTML(b.title) + '», de ' + escapeHTML(b.author) + '" loading="lazy">' +
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
