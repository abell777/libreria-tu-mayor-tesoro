// ==========================================================================
// Carrito de compra — estado compartido (localStorage) entre
// Home, Catálogo, Ficha de producto y Carrito.
// ==========================================================================
window.Cart = (function () {
  var STORAGE_KEY = 'fundamento_cart';
  var PROMO_STORAGE_KEY = 'fundamento_promo';

  function getItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadge();
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  // ---- Código promocional aplicado ----------------------------------------
  // Solo guarda el código + su tipo/valor, tal como los devolvió
  // "validarPromo" — nunca un importe de descuento ya calculado, para que
  // el resumen se recalcule siempre a partir del subtotal actual. El
  // descuento DE VERDAD (el que se cobra) siempre lo decide el servidor
  // en "crearPedido", esto es solo para mostrarlo en el carrito.
  function getPromo() {
    try {
      return JSON.parse(sessionStorage.getItem(PROMO_STORAGE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function setPromo(promo) {
    sessionStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promo));
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  function clearPromo() {
    sessionStorage.removeItem(PROMO_STORAGE_KEY);
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  // Dos líneas del mismo libro se consideran la MISMA solo si coinciden el
  // id, el formato (que ya incluye la portada elegida) y los extras de
  // regalo. Así se puede pedir un ejemplar envuelto y otro sin envolver.
  function lineKeyOf(item) {
    return item.giftKey || (window.giftKey ? window.giftKey(item.regalo) : '');
  }
  function sameLine(i, id, format, giftKey) {
    return i.id === id && i.format === format && lineKeyOf(i) === (giftKey || '');
  }

  // Enlace a la ficha del libro de una línea del carrito. Si la línea tiene una
  // portada elegida, se pasa en la URL para que la ficha se abra con ESA portada
  // seleccionada (ver "portada" en js/product.js).
  function productUrl(item) {
    if (!item || !item.id || String(item.id).indexOf('extra-') === 0) return '';
    return 'producto.html?id=' + encodeURIComponent(item.id) +
      (item.coverStyle ? '&portada=' + encodeURIComponent(item.coverStyle) : '');
  }
  window.cartProductUrl = productUrl;

  function addItem(item) {
    var items = getItems();
    item.giftKey = lineKeyOf(item);
    var existing = items.filter(function (i) { return sameLine(i, item.id, item.format, item.giftKey); })[0];
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      item.qty = item.qty || 1;
      items.push(item);
    }
    saveItems(items);
  }

  function removeItem(id, format, giftKey) {
    saveItems(getItems().filter(function (i) { return !sameLine(i, id, format, giftKey); }));
  }

  function setQty(id, format, qty, giftKey) {
    var items = getItems();
    var item = items.filter(function (i) { return sameLine(i, id, format, giftKey); })[0];
    if (item) {
      item.qty = Math.max(1, qty);
      saveItems(items);
    }
  }

  function totalCount() {
    return getItems().reduce(function (sum, i) { return sum + i.qty; }, 0);
  }

  function totalPrice() {
    return getItems().reduce(function (sum, i) { return sum + i.qty * i.price; }, 0);
  }

  // Importe de los extras de regalo (envoltorio, exlibris, funda…). Se
  // calcula siempre desde js/gift-options.js, nunca se guarda un total.
  function extrasTotal() {
    return window.giftExtrasTotal ? Math.round(window.giftExtrasTotal(getItems()) * 100) / 100 : 0;
  }

  function clearItems() {
    saveItems([]);
  }

  function updateBadge() {
    var badge = document.querySelector('[data-cart-count]');
    if (!badge) return;
    var count = totalCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  return {
    getItems: getItems,
    addItem: addItem,
    removeItem: removeItem,
    setQty: setQty,
    clear: clearItems,
    totalCount: totalCount,
    totalPrice: totalPrice,
    extrasTotal: extrasTotal,
    updateBadge: updateBadge,
    getPromo: getPromo,
    setPromo: setPromo,
    clearPromo: clearPromo
  };
})();

// ==========================================================================
// Sincronización del "carrito abandonado" — solo con sesión iniciada
// --------------------------------------------------------------------------
// Cada vez que cambia el carrito (con sesión iniciada), guarda una copia
// mínima en Firestore (colección "carritosAbandonados/{uid}"): solo el id,
// el título y la cantidad de cada libro — NUNCA el precio, que siempre lo
// vuelve a calcular el servidor contra el catálogo real antes de mandar
// cualquier correo. Sin sesión no se guarda nada (no tendríamos a qué
// email escribir). Al vaciar el carrito, se borra el documento.
//
// La Cloud Function "recordatorioCarritoAbandonado" (functions/index.js)
// revisa esta colección una vez por hora y, si el carrito lleva varias
// horas sin cambios, manda un correo recordándolo — no hace falta tocar
// nada más aquí para que funcione.
// ==========================================================================
(function () {
  var SYNC_DEBOUNCE_MS = 4000;
  var syncTimer = null;
  var usuarioActual = null;

  function sincronizarCarritoAbandonado() {
    if (!window.fbDb || !usuarioActual || typeof firebase === 'undefined') return;
    var ref = window.fbDb.collection('carritosAbandonados').doc(usuarioActual.uid);
    var items = Cart.getItems();

    if (items.length === 0) {
      ref.delete().catch(function () {});
      return;
    }

    var itemsParaGuardar = items.slice(0, 30).map(function (item) {
      return {
        id: item.id || '',
        titulo: (item.title || '').slice(0, 200),
        cantidad: Math.max(1, Math.min(20, item.qty || 1))
      };
    });

    ref.set({
      uid: usuarioActual.uid,
      email: usuarioActual.email || '',
      nombre: usuarioActual.displayName || '',
      items: itemsParaGuardar,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      recordatorioEnviado: false
    }).catch(function (err) {
      console.error('No se pudo guardar el carrito para el recordatorio', err);
    });
  }

  function programarSync() {
    if (!usuarioActual) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sincronizarCarritoAbandonado, SYNC_DEBOUNCE_MS);
  }

  document.addEventListener('cart:change', programarSync);

  if (window.fbAuth) {
    window.fbAuth.onAuthStateChanged(function (user) {
      usuarioActual = user || null;
      // Al iniciar sesión con libros ya en el carrito (añadidos como
      // invitado), los sincroniza también; sin sesión, no hay nada que
      // sincronizar (y "sincronizarCarritoAbandonado" no hace nada, por
      // el "if (!usuarioActual)" de arriba).
      if (usuarioActual) programarSync();
    });
  }
})();

// ---- Utilidades -----------------------------------------------------------
// Escapa HTML antes de insertar cualquier texto con innerHTML. Se usa en
// todo el sitio (carrito, opiniones, panel de admin) para que un nombre,
// dirección o comentario con < > " ' nunca se interprete como código.
// Pulsar en cualquier parte de una línea del carrito (salvo en los botones, el
// selector de cantidad o un enlace) abre la ficha del libro.
function makeRowClickable(row) {
  var href = row.getAttribute('data-href');
  if (!href) return;
  row.classList.add('is-clickable');
  row.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, .qty-stepper')) return;
    window.location.href = href;
  });
}

function escapeHTML(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtEUR(value) {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00A0€';
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function flashAdded(btn) {
  var original = btn.textContent;
  btn.textContent = 'Añadido ✓';
  btn.classList.add('is-added');
  setTimeout(function () {
    btn.textContent = original;
    btn.classList.remove('is-added');
  }, 1300);
}

// Función auxiliar para asociar la imagen según el título del libro.
// Primero mira en el catálogo centralizado (js/books-data.js); si un libro
// no está ahí (o esa página no lo carga), usa este mapa de respaldo.
function getBookImage(title) {
  if (window.BOOKS) {
    var match = window.BOOKS.filter(function (b) { return b.title === title; })[0];
    if (match) return match.cover;
  }
  const imageMap = {
    "El Conflicto de los Siglos": "img/el-conflicto-de-los-siglos.jpg",
    "El Deseado de Todas las Gentes": "img/el-deseado-de-todas-las-gentes.jpg",
    "Historia de los Patriarcas y Profetas": "img/historia-de-los-patriarcas-y-profetas.jpg",
    "Profetas y Reyes": "img/profetas-y-reyes.jpg"
  };
  
  return imageMap[title] || DEFAULT_BOOK_COVER;
}

// Portada genérica (SVG en línea) para libros sin foto propia — así nunca
// se rompe la imagen en el carrito aunque el título no esté en imageMap.
var DEFAULT_BOOK_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">' +
  '<rect width="120" height="160" fill="#1f2b45"/>' +
  '<rect x="10" y="10" width="100" height="140" fill="none" stroke="#c9a15a" stroke-width="2"/>' +
  '<line x1="24" y1="60" x2="96" y2="60" stroke="#c9a15a" stroke-width="1.5"/>' +
  '<line x1="24" y1="72" x2="96" y2="72" stroke="#c9a15a" stroke-width="1.5"/>' +
  '</svg>'
);
document.addEventListener('DOMContentLoaded', function () {
  Cart.updateBadge();
  setupCartDrawer();

  // ---- Botones "Añadir" en tarjetas de libro (Home / Catálogo / relacionados) ----
  // Delegado en el documento (no un listener por tarjeta): así también
  // funcionan las tarjetas que se pintan después de cargar la página, como la
  // lista de deseos de Mi cuenta, que antes no podía añadir al carrito.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.book-card .book-footer .btn');
    if (!btn) return;
    var card = btn.closest('.book-card');
    (function () {
      e.preventDefault();
      var titleEl = card.querySelector('.book-title');
      var authorEl = card.querySelector('.book-author');
      var priceEl = card.querySelector('.book-price');
      var title = titleEl ? titleEl.textContent.trim() : 'Libro';
      var author = authorEl ? authorEl.textContent.trim() : '';
      var priceText = priceEl ? priceEl.childNodes[0].textContent : '0';
      var price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      var id = card.dataset.productId || slugify(title);

      // Si el libro está en el catálogo, se usan su formato real y la
      // portada que la tarjeta está mostrando en ese momento (las tarjetas
      // con dos diseños van alternando: ver js/cover-carousel.js). Así el
      // cliente mete en el carrito exactamente la versión que ve.
      var libro = window.BooksCatalog ? window.BooksCatalog.getById(id) : null;
      var coverFile = card.dataset.coverFile || (libro ? libro.cover : getBookImage(title));
      var coverStyle = card.dataset.coverStyle || '';
      var coverLabel = card.dataset.coverLabel || '';
      var varias = libro && window.hasMultipleCovers ? window.hasMultipleCovers(libro) : false;
      var formato = libro ? libro.format : 'Estándar';
      if (varias && coverLabel) formato += ' · ' + coverLabel;

      Cart.addItem({
        id: id,
        title: title,
        author: author,
        price: price,
        format: formato,
        coverStyle: coverStyle,
        cover: coverFile,
        qty: 1
      });
      flashAdded(btn);
      openCartDrawer();
    })();
  });

  // ---- Botón "Añadir al carrito" dedicado (Ficha de producto) ----
  var mainAddBtn = document.querySelector('[data-add-to-cart]');
  if (mainAddBtn) {
    var block = mainAddBtn.closest('[data-product-block]');
    mainAddBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var qtyInput = block ? block.querySelector('[data-qty-input]') : null;
      var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
      var activePill = block ? block.querySelector('.option-pill.is-active') : null;

      var regalo = null;
      try {
        regalo = mainAddBtn.dataset.gift ? JSON.parse(mainAddBtn.dataset.gift) : null;
      } catch (err) { regalo = null; }
      if (regalo && !Object.keys(regalo).length) regalo = null;

      // Libros con configurador de impresión (colección Elena G. White):
      // la combinación elegida (tapa, tamaño, acabado, papel) viaja con la
      // línea del carrito para que, al pedir de verdad, el servidor pueda
      // volver a calcular el precio exacto contra su propia tabla — nunca
      // se cobra el precio que calcula el navegador tal cual.
      var imp = null;
      try {
        imp = mainAddBtn.dataset.imp ? JSON.parse(mainAddBtn.dataset.imp) : null;
      } catch (err) { imp = null; }

      Cart.addItem({
        id: mainAddBtn.dataset.id,
        title: mainAddBtn.dataset.title,
        author: mainAddBtn.dataset.author,
        regalo: regalo,
        imp: imp,
        price: activePill ? parseFloat(activePill.dataset.price) : parseFloat(mainAddBtn.dataset.price),
        format: activePill ? activePill.dataset.format : (mainAddBtn.dataset.format || 'Estándar'),
        coverStyle: mainAddBtn.dataset.coverStyle || '',
        cover: mainAddBtn.dataset.cover || getBookImage(mainAddBtn.dataset.title),
        qty: qty
      });
      flashAdded(mainAddBtn);
      openCartDrawer();
    });
  }

  // ---- Página de carrito ----
  var cartItemsEl = document.getElementById('cartItems');
  if (cartItemsEl) {
    renderCartPage();
    document.addEventListener('cart:change', renderCartPage);
  }

  function renderCartPage() {
    var items = Cart.getItems();
    var layout = document.getElementById('cartLayout');
    var emptyState = document.getElementById('cartEmpty');

    if (items.length === 0) {
      if (layout) layout.hidden = true;
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (layout) layout.hidden = false;
    if (emptyState) emptyState.hidden = true;

    cartItemsEl.innerHTML = items.map(function (item) {
      // Usamos item.cover si ya viene guardado, o comprobamos con getBookImage si falta
      var imagePath = item.cover && item.cover.startsWith('img/') ? item.cover : getBookImage(item.title);

      var extras = window.giftExtrasFor ? window.giftExtrasFor(item) : [];
      var extrasHTML = extras.length
        ? '<ul class="cart-item-gifts">' + extras.map(function (e) {
            return '<li><span>' + escapeHTML(e.label) + (e.texto ? ': «' + escapeHTML(e.texto) + '»' : '') + '</span>' +
              '<span>' + (e.total > 0 ? fmtEUR(e.total) : 'Incluido') + '</span></li>';
          }).join('') + '</ul>'
        : '';

      return (
        '<article class="cart-item" data-id="' + escapeHTML(item.id) + '" data-format="' + escapeHTML(item.format) +
        '" data-gift-key="' + escapeHTML(item.giftKey || '') + '"' +
        (window.cartProductUrl(item) ? ' data-href="' + escapeHTML(window.cartProductUrl(item)) + '"' : '') + '>' +
          (window.cartProductUrl(item)
            ? '<a href="' + escapeHTML(window.cartProductUrl(item)) + '" class="cart-item-img-link" aria-label="Ver «' + escapeHTML(item.title) + '»">' +
                '<img src="' + imagePath + '" alt="' + escapeHTML(item.title) + '" class="cart-item-img"></a>'
            : '<img src="' + imagePath + '" alt="' + escapeHTML(item.title) + '" class="cart-item-img">') +
          '<div class="cart-item-info">' +
            '<h3>' + (window.cartProductUrl(item)
              ? '<a href="' + escapeHTML(window.cartProductUrl(item)) + '">' + escapeHTML(item.title) + '</a>'
              : escapeHTML(item.title)) + '</h3>' +
            '<p class="cart-item-format">' + escapeHTML(item.author) + (item.format && item.format !== 'Estándar' ? ' · ' + escapeHTML(item.format) : '') + '</p>' +
            extrasHTML +
            '<div class="cart-item-links">' +
              (window.cartProductUrl(item)
                ? '<a href="' + escapeHTML(window.cartProductUrl(item)) + '" class="cart-item-details">Ver detalles del libro</a>'
                : '') +
              '<button class="cart-item-remove" type="button" data-remove>Eliminar</button>' +
            '</div>' +
          '</div>' +
          '<div class="qty-stepper">' +
            '<button type="button" class="qty-btn" data-decrease aria-label="Restar cantidad">−</button>' +
            '<input type="number" class="qty-input" data-qty value="' + item.qty + '" min="1" max="20" aria-label="Cantidad">' +
            '<button type="button" class="qty-btn" data-increase aria-label="Sumar cantidad">+</button>' +
          '</div>' +
          '<div class="cart-item-price">' + fmtEUR(item.price * item.qty) + '</div>' +
        '</article>'
      );
    }).join('');

    cartItemsEl.querySelectorAll('.cart-item').forEach(function (row) {
      makeRowClickable(row);
      var id = row.dataset.id;
      var format = row.dataset.format;
      var giftKey = row.dataset.giftKey || '';
      var qtyInput = row.querySelector('[data-qty]');

      row.querySelector('[data-remove]').addEventListener('click', function () {
        Cart.removeItem(id, format, giftKey);
      });
      row.querySelector('[data-decrease]').addEventListener('click', function () {
        Cart.setQty(id, format, parseInt(qtyInput.value, 10) - 1, giftKey);
      });
      row.querySelector('[data-increase]').addEventListener('click', function () {
        Cart.setQty(id, format, parseInt(qtyInput.value, 10) + 1, giftKey);
      });
      qtyInput.addEventListener('change', function () {
        Cart.setQty(id, format, parseInt(qtyInput.value, 10) || 1, giftKey);
      });
    });

    updateSummary();
  }

  function updateSummary() {
    var subtotal = Cart.totalPrice();
    // Envío gratis solo si TODOS los libros del carrito lo tienen marcado
    // en el catálogo (book.freeShipping); si hay alguno sin esa marca, o si
    // el catálogo aún no ha cargado, se cobran los 6€ de siempre.
    var items = Cart.getItems();
    var todosEnvioGratis = items.length > 0 && window.BooksCatalog && items.every(function (item) {
      var libro = window.BooksCatalog.getById(item.id);
      return !!(libro && libro.freeShipping);
    });
    var SHIPPING = todosEnvioGratis ? 0 : 6;

    // El descuento se recalcula aquí a partir del subtotal actual (nunca se
    // guarda un importe fijo), así que si cambias cantidades en el carrito
    // se actualiza solo. Es solo una vista previa: el importe que de verdad
    // se cobra lo vuelve a calcular el servidor al crear el pedido.
    var promo = Cart.getPromo();
    var descuento = 0;
    if (promo && items.length) {
      var bruto = promo.tipo === 'porcentaje' ? subtotal * (promo.valor / 100) : promo.valor;
      descuento = Math.max(0, Math.min(subtotal, Math.round(bruto * 100) / 100));
    }

    // Extras de regalo: se muestran en su propia fila para que el cliente
    // vea con claridad qué está pagando por el libro y qué por el detalle.
    var extras = Cart.extrasTotal();
    var extrasRow = document.getElementById('summaryExtrasRow');
    var extrasEl = document.getElementById('summaryExtras');
    if (extrasRow) extrasRow.hidden = extras <= 0;
    if (extrasEl) extrasEl.textContent = fmtEUR(extras);

    var subtotalEl = document.getElementById('summarySubtotal');
    var shippingEl = document.getElementById('summaryShipping');
    var totalEl = document.getElementById('summaryTotal');
    var discountRow = document.getElementById('summaryDiscountRow');
    var discountEl = document.getElementById('summaryDiscount');

    if (subtotalEl) subtotalEl.textContent = fmtEUR(subtotal);
    if (shippingEl) shippingEl.textContent = SHIPPING === 0 ? 'Gratis' : fmtEUR(SHIPPING);
    if (discountRow) discountRow.hidden = descuento <= 0;
    if (discountEl) discountEl.textContent = '−' + fmtEUR(descuento);
    var total = Math.max(0, subtotal + extras + SHIPPING - descuento);
    if (totalEl) totalEl.textContent = fmtEUR(total);
  }

  // ---- Formulario de código promocional -----------------------------------
  var promoForm = document.getElementById('promoForm');
  if (promoForm) {
    var promoInput = promoForm.querySelector('input');
    var promoBtn = promoForm.querySelector('button');
    var promoMsg = document.getElementById('promoMessage');

    function pintarEstadoPromo() {
      var promo = Cart.getPromo();
      if (promo) {
        promoInput.value = promo.codigo;
        promoInput.disabled = true;
        promoBtn.textContent = 'Quitar';
      } else {
        promoInput.disabled = false;
        promoBtn.textContent = 'Aplicar';
      }
    }
    pintarEstadoPromo();
    document.addEventListener('cart:change', pintarEstadoPromo);

    promoForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Si ya hay un código aplicado, este mismo botón sirve para quitarlo.
      if (Cart.getPromo()) {
        Cart.clearPromo();
        promoInput.value = '';
        if (promoMsg) promoMsg.hidden = true;
        return;
      }

      var codigo = promoInput.value.trim();
      if (!codigo) return;
      if (!window.firebase || !firebase.functions) return;

      promoBtn.disabled = true;
      promoBtn.textContent = 'Comprobando…';
      if (promoMsg) promoMsg.hidden = true;

      var itemsParaValidar = Cart.getItems().map(function (i) { return { id: i.id, qty: i.qty }; });
      var validarPromoFn = firebase.functions().httpsCallable('validarPromo');

      validarPromoFn({ codigo: codigo, items: itemsParaValidar }).then(function (res) {
        Cart.setPromo({ codigo: res.data.codigo, tipo: res.data.tipo, valor: res.data.valor });
        if (promoMsg) {
          promoMsg.textContent = 'Código "' + res.data.codigo + '" aplicado: −' + fmtEUR(res.data.descuento) + '.';
          promoMsg.classList.remove('is-error');
          promoMsg.hidden = false;
        }
      }).catch(function (err) {
        Cart.clearPromo();
        if (promoMsg) {
          promoMsg.textContent = (err && err.message) || 'Ese código no es válido.';
          promoMsg.classList.add('is-error');
          promoMsg.hidden = false;
        }
      }).finally(function () {
        promoBtn.disabled = false;
        pintarEstadoPromo();
      });
    });
  }
});

// ==========================================================================
// Mini-carrito lateral (drawer) — se crea una sola vez y se reutiliza en
// todas las páginas. Se abre al pulsar el icono del carrito del header o
// justo después de añadir un libro, sin salir de la página en la que
// estés. En carrito.html, el icono sigue llevando a la página completa.
// ==========================================================================
var cartDrawerOverlay = null;

function setupCartDrawer() {
  // No hace falta el drawer si ya estamos en la página del carrito.
  if (document.getElementById('cartItems')) return;

  var cartLink = document.querySelector('a.icon-btn[href="carrito.html"]');
  if (!cartLink) return;

  buildCartDrawer();

  cartLink.addEventListener('click', function (e) {
    e.preventDefault();
    openCartDrawer();
  });

  document.addEventListener('cart:change', function () {
    if (cartDrawerOverlay && cartDrawerOverlay.classList.contains('is-open')) {
      renderCartDrawer();
    }
  });
}

function buildCartDrawer() {
  cartDrawerOverlay = document.createElement('div');
  cartDrawerOverlay.className = 'cart-drawer-overlay';
  cartDrawerOverlay.innerHTML =
    '<aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Tu carrito">' +
      '<div class="cart-drawer-header">' +
        '<h2>Tu carrito</h2>' +
        '<button type="button" class="cart-drawer-close" aria-label="Cerrar carrito">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="cart-drawer-body" id="cartDrawerBody"></div>' +
      '<div class="cart-drawer-footer" id="cartDrawerFooter"></div>' +
    '</aside>';

  document.body.appendChild(cartDrawerOverlay);

  cartDrawerOverlay.addEventListener('click', function (e) {
    if (e.target === cartDrawerOverlay) closeCartDrawer();
  });
  cartDrawerOverlay.querySelector('.cart-drawer-close').addEventListener('click', closeCartDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cartDrawerOverlay && cartDrawerOverlay.classList.contains('is-open')) {
      closeCartDrawer();
    }
  });
}

function renderCartDrawer() {
  var items = Cart.getItems();
  var body = document.getElementById('cartDrawerBody');
  var footer = document.getElementById('cartDrawerFooter');
  if (!body || !footer) return;

  if (items.length === 0) {
    body.innerHTML =
      '<div class="cart-drawer-empty">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
        '<p>Tu carrito está vacío.</p>' +
      '</div>';
    footer.innerHTML = '<a href="categoria.html" class="btn btn--primary">Ver el catálogo</a>';
    return;
  }

  body.innerHTML = items.map(function (item) {
    var imagePath = item.cover && item.cover.startsWith('img/') ? item.cover : getBookImage(item.title);
    var extras = window.giftExtrasFor ? window.giftExtrasFor(item) : [];
    var extrasHTML = extras.length
      ? '<ul class="cart-item-gifts">' + extras.map(function (e) {
          return '<li><span>' + escapeHTML(e.label) + (e.texto ? ': «' + escapeHTML(e.texto) + '»' : '') + '</span>' +
            '<span>' + (e.total > 0 ? fmtEUR(e.total) : 'Incluido') + '</span></li>';
        }).join('') + '</ul>'
      : '';
    var extrasSumaItem = extras.reduce(function (s, e) { return s + e.total; }, 0);
    return (
      '<article class="cart-drawer-item" data-id="' + escapeHTML(item.id) + '" data-format="' + escapeHTML(item.format) + '"' +
      (window.cartProductUrl(item) ? ' data-href="' + escapeHTML(window.cartProductUrl(item)) + '"' : '') + '>' +
        (window.cartProductUrl(item)
          ? '<a href="' + escapeHTML(window.cartProductUrl(item)) + '" class="cart-drawer-item-img" aria-label="Ver «' + escapeHTML(item.title) + '»">' +
              '<img src="' + imagePath + '" alt="' + escapeHTML(item.title) + '"></a>'
          : '<img src="' + imagePath + '" alt="' + escapeHTML(item.title) + '">') +
        '<div class="cart-drawer-item-info">' +
          '<h3>' + (window.cartProductUrl(item)
            ? '<a href="' + escapeHTML(window.cartProductUrl(item)) + '">' + escapeHTML(item.title) + '</a>'
            : escapeHTML(item.title)) + '</h3>' +
          '<p>' + escapeHTML(item.format && item.format !== 'Estándar' ? item.format : '') + '</p>' +
          extrasHTML +
          (window.cartProductUrl(item)
            ? '<a href="' + escapeHTML(window.cartProductUrl(item)) + '" class="cart-drawer-item-details">Ver detalles</a>'
            : '') +
          '<div class="cart-drawer-item-actions">' +
            '<div class="qty-stepper">' +
              '<button type="button" class="qty-btn" data-decrease aria-label="Restar cantidad">−</button>' +
              '<input type="number" class="qty-input" data-qty value="' + item.qty + '" min="1" max="20" aria-label="Cantidad">' +
              '<button type="button" class="qty-btn" data-increase aria-label="Sumar cantidad">+</button>' +
            '</div>' +
            '<button type="button" class="cart-drawer-item-remove" data-remove>Eliminar</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-drawer-item-price">' + fmtEUR(item.price * item.qty + extrasSumaItem) + '</div>' +
      '</article>'
    );
  }).join('');

  body.querySelectorAll('.cart-drawer-item').forEach(function (row) {
    makeRowClickable(row);
    var id = row.dataset.id;
    var format = row.dataset.format;
    var qtyInput = row.querySelector('[data-qty]');

    row.querySelector('[data-remove]').addEventListener('click', function () {
      Cart.removeItem(id, format);
    });
    row.querySelector('[data-decrease]').addEventListener('click', function () {
      Cart.setQty(id, format, parseInt(qtyInput.value, 10) - 1);
    });
    row.querySelector('[data-increase]').addEventListener('click', function () {
      Cart.setQty(id, format, parseInt(qtyInput.value, 10) + 1);
    });
    qtyInput.addEventListener('change', function () {
      Cart.setQty(id, format, parseInt(qtyInput.value, 10) || 1);
    });
  });

  var subtotal = Cart.totalPrice();
  var extrasDrawer = Cart.extrasTotal();
  footer.innerHTML =
    (extrasDrawer > 0 ? '<div class="cart-drawer-subtotal"><span>Extras de regalo</span><span>' + fmtEUR(extrasDrawer) + '</span></div>' : '') +
    '<div class="cart-drawer-subtotal"><span>Subtotal</span><span>' + fmtEUR(subtotal + extrasDrawer) + '</span></div>' +
    '<a href="carrito.html" class="btn btn--outline">Ver carrito</a>' +
    '<a href="carrito.html" class="btn btn--primary">Finalizar compra</a>';
}

function openCartDrawer() {
  if (!cartDrawerOverlay) return;
  renderCartDrawer();
  cartDrawerOverlay.classList.add('is-open');
  document.body.classList.add('no-scroll');
}

function closeCartDrawer() {
  if (!cartDrawerOverlay) return;
  cartDrawerOverlay.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
}