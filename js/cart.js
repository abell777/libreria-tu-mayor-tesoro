// ==========================================================================
// Carrito de compra — estado compartido (localStorage) entre
// Home, Catálogo, Ficha de producto y Carrito.
// ==========================================================================
window.Cart = (function () {
  var STORAGE_KEY = 'fundamento_cart';

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

  function addItem(item) {
    var items = getItems();
    var existing = items.filter(function (i) { return i.id === item.id && i.format === item.format; })[0];
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      item.qty = item.qty || 1;
      items.push(item);
    }
    saveItems(items);
  }

  function removeItem(id, format) {
    saveItems(getItems().filter(function (i) { return !(i.id === id && i.format === format); }));
  }

  function setQty(id, format, qty) {
    var items = getItems();
    var item = items.filter(function (i) { return i.id === id && i.format === format; })[0];
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
    updateBadge: updateBadge
  };
})();

// ---- Utilidades -----------------------------------------------------------
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

// Función auxiliar para asociar la imagen según el título del libro
function getBookImage(title) {
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

  // ---- Botones "Añadir" en tarjetas de libro (Home / Catálogo / relacionados) ----
  document.querySelectorAll('.book-card').forEach(function (card) {
    var btn = card.querySelector('.book-footer .btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var titleEl = card.querySelector('.book-title');
      var authorEl = card.querySelector('.book-author');
      var priceEl = card.querySelector('.book-price');
      var title = titleEl ? titleEl.textContent.trim() : 'Libro';
      var author = authorEl ? authorEl.textContent.trim() : '';
      var priceText = priceEl ? priceEl.childNodes[0].textContent : '0';
      var price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      var id = card.dataset.productId || slugify(title);

      Cart.addItem({ 
        id: id, 
        title: title, 
        author: author, 
        price: price, 
        format: 'Estándar', 
        cover: getBookImage(title), 
        qty: 1 
      });
      flashAdded(btn);
    });
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

      Cart.addItem({
        id: mainAddBtn.dataset.id,
        title: mainAddBtn.dataset.title,
        author: mainAddBtn.dataset.author,
        price: activePill ? parseFloat(activePill.dataset.price) : parseFloat(mainAddBtn.dataset.price),
        format: activePill ? activePill.dataset.format : (mainAddBtn.dataset.format || 'Estándar'),
        cover: getBookImage(mainAddBtn.dataset.title),
        qty: qty
      });
      flashAdded(mainAddBtn);
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

      return (
        '<article class="cart-item" data-id="' + item.id + '" data-format="' + item.format + '">' +
          '<img src="' + imagePath + '" alt="' + item.title + '" class="cart-item-img">' +
          
          '<div class="cart-item-info">' +
            '<h3>' + item.title + '</h3>' +
            '<p class="cart-item-format">' + item.author + (item.format && item.format !== 'Estándar' ? ' · ' + item.format : '') + '</p>' +
            '<button class="cart-item-remove" type="button" data-remove>Eliminar</button>' +
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

    updateSummary();
  }

  function updateSummary() {
    var subtotal = Cart.totalPrice();
    var shippingFree = subtotal >= 40 || subtotal === 0;
    var subtotalEl = document.getElementById('summarySubtotal');
    var shippingEl = document.getElementById('summaryShipping');
    var totalEl = document.getElementById('summaryTotal');
    if (subtotalEl) subtotalEl.textContent = fmtEUR(subtotal);
    if (shippingEl) shippingEl.textContent = shippingFree ? 'Gratis' : fmtEUR(3.95);
    if (totalEl) totalEl.textContent = fmtEUR(subtotal + (shippingFree ? 0 : 3.95));
  }

  var promoForm = document.getElementById('promoForm');
  if (promoForm) {
    promoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = promoForm.querySelector('button');
      var original = btn.textContent;
      btn.textContent = 'Código no válido';
      setTimeout(function () { btn.textContent = original; }, 1800);
    });
  }
});