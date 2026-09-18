// ==========================================================================
// "Regala con propósito" — bloque de la ficha de producto
// --------------------------------------------------------------------------
// Añade, debajo de los botones de compra de CUALQUIER libro, un bloque
// plegable donde el cliente puede pedir envoltorio de regalo, escribir una
// dedicatoria, añadir un exlibris con su nombre o sumar una funda de tela.
//
// Lo que elija se guarda en el botón "Añadir al carrito"
// (addToCartBtn.dataset.gift) y js/cart.js lo mete en la línea del carrito.
// De ahí viaja al pedido, donde el servidor vuelve a calcular los importes
// con su propia tabla de precios (functions/index.js).
//
// Los extras y sus precios salen de js/gift-options.js: no hay nada
// escrito a mano aquí, así que cambiando ese archivo cambia esta pantalla.
// ==========================================================================
(function () {
  var addBtn = document.getElementById('addToCartBtn');
  var actions = document.querySelector('.product-actions');
  if (!addBtn || !actions || !window.GIFT_EXTRAS) return;

  // En un libro que todavía no está a la venta no tiene sentido ofrecerlo.
  if (addBtn.disabled) return;

  function fmt(n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00A0€';
  }

  var box = document.createElement('section');
  box.className = 'gift-box';
  box.innerHTML =
    '<button type="button" class="gift-toggle" aria-expanded="false">' +
      '<span class="gift-toggle-icon" aria-hidden="true">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/>' +
        '<path d="M12 8S10 3 7.5 3a2.5 2.5 0 0 0 0 5M12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>' +
      '</span>' +
      '<span class="gift-toggle-text">' +
        '<strong>Regala con propósito</strong>' +
        '<small>Envoltorio, dedicatoria, exlibris o funda de tela</small>' +
      '</span>' +
      '<span class="gift-toggle-chevron" aria-hidden="true">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</span>' +
    '</button>' +
    '<div class="gift-panel" hidden>' +
      '<p class="gift-intro">Un libro también acompaña. Si es para un bautismo, una boda, un aniversario o para alguien que está pasando un momento difícil, puedes prepararlo con nosotros.</p>' +
      window.GIFT_EXTRAS.map(function (g) {
        return (
          '<div class="gift-option" data-gift-slug="' + g.slug + '">' +
            '<label class="gift-check">' +
              '<input type="checkbox" data-gift-toggle="' + g.slug + '">' +
              '<span class="gift-check-body">' +
                '<span class="gift-check-head">' +
                  '<span class="gift-name">' + escapeHTML(g.label) + '</span>' +
                  '<span class="gift-price">' + (g.price > 0 ? '+ ' + fmt(g.price) + (g.perUnit ? ' / ejemplar' : '') : 'Incluido') + '</span>' +
                '</span>' +
                '<span class="gift-desc">' + escapeHTML(g.desc) + '</span>' +
              '</span>' +
            '</label>' +
            (g.input === 'texto'
              ? '<div class="gift-field" hidden>' +
                  (g.maxLength > 120
                    ? '<textarea rows="3" maxlength="' + g.maxLength + '" data-gift-text="' + g.slug + '" placeholder="' + escapeHTML(g.placeholder || '') + '"></textarea>'
                    : '<input type="text" maxlength="' + g.maxLength + '" data-gift-text="' + g.slug + '" placeholder="' + escapeHTML(g.placeholder || '') + '">') +
                  '<p class="gift-counter"><span data-gift-count="' + g.slug + '">0</span>/' + g.maxLength + ' caracteres</p>' +
                '</div>'
              : '') +
          '</div>'
        );
      }).join('') +
      '<p class="gift-total" data-gift-total hidden></p>' +
      '<p class="gift-note">Lo preparamos a mano antes de enviarlo. Si necesitas algo especial (varios destinatarios, un envío para una fecha concreta), escríbenos desde <a href="consejo.html">Pide consejo a nuestro librero</a>.</p>' +
    '</div>';

  actions.insertAdjacentElement('afterend', box);

  var toggle = box.querySelector('.gift-toggle');
  var panel = box.querySelector('.gift-panel');
  toggle.addEventListener('click', function () {
    var abierto = !panel.hidden;
    panel.hidden = abierto;
    toggle.setAttribute('aria-expanded', abierto ? 'false' : 'true');
    box.classList.toggle('is-open', !abierto);
  });

  var totalEl = box.querySelector('[data-gift-total]');

  function leerRegalo() {
    var regalo = {};
    window.GIFT_EXTRAS.forEach(function (g) {
      var cb = box.querySelector('[data-gift-toggle="' + g.slug + '"]');
      if (!cb || !cb.checked) return;
      if (g.input === 'texto') {
        var campo = box.querySelector('[data-gift-text="' + g.slug + '"]');
        var texto = campo ? campo.value.trim() : '';
        if (texto) regalo[g.slug] = texto;
      } else {
        regalo[g.slug] = true;
      }
    });
    return regalo;
  }

  function refrescar() {
    var regalo = leerRegalo();
    // El botón de añadir al carrito lleva el regalo ya preparado: cart.js
    // solo tiene que leerlo.
    addBtn.dataset.gift = JSON.stringify(regalo);

    var qtyInput = document.querySelector('[data-product-block] [data-qty-input]');
    var qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
    var extras = window.giftExtrasFor({ regalo: regalo, qty: qty });
    var suma = extras.reduce(function (s, e) { return s + e.total; }, 0);

    if (suma > 0) {
      totalEl.innerHTML = 'Extras de regalo: <strong>' + fmt(suma) + '</strong>' +
        (qty > 1 ? ' <small>(' + qty + ' ejemplares)</small>' : '');
      totalEl.hidden = false;
    } else {
      totalEl.hidden = true;
    }
  }

  window.GIFT_EXTRAS.forEach(function (g) {
    var cb = box.querySelector('[data-gift-toggle="' + g.slug + '"]');
    var campoWrap = box.querySelector('[data-gift-slug="' + g.slug + '"] .gift-field');
    var campo = box.querySelector('[data-gift-text="' + g.slug + '"]');
    var contador = box.querySelector('[data-gift-count="' + g.slug + '"]');

    if (cb) {
      cb.addEventListener('change', function () {
        if (campoWrap) {
          campoWrap.hidden = !cb.checked;
          if (cb.checked && campo) campo.focus();
        }
        refrescar();
      });
    }
    if (campo) {
      campo.addEventListener('input', function () {
        if (contador) contador.textContent = String(campo.value.length);
        refrescar();
      });
    }
  });

  // Si el cliente cambia la cantidad, el importe de los extras cambia con ella.
  var block = document.querySelector('[data-product-block]');
  if (block) {
    block.addEventListener('click', function (e) {
      if (e.target.closest('[data-qty-increase], [data-qty-decrease]')) setTimeout(refrescar, 0);
    });
    var qi = block.querySelector('[data-qty-input]');
    if (qi) qi.addEventListener('change', refrescar);
  }

  refrescar();
})();
