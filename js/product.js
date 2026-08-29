// ==========================================================================
// Ficha de producto: miniaturas, formato, cantidad y pestañas.
// Solo se ejecuta si existe la galería de producto (.product-gallery).
// ==========================================================================
(function () {
  var gallery = document.querySelector('.product-gallery');
  if (!gallery) return;

  // ---- Miniaturas: cambian la portada principal ----
  var mainCover = document.getElementById('mainCover');
  gallery.querySelectorAll('.thumb').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      gallery.querySelectorAll('.thumb').forEach(function (t) { t.classList.remove('is-active'); });
      thumb.classList.add('is-active');
      if (mainCover) {
        Array.prototype.slice.call(mainCover.classList).forEach(function (c) {
          if (c.indexOf('cover--') === 0) mainCover.classList.remove(c);
        });
        mainCover.classList.add(thumb.dataset.cover);
      }
    });
  });

  var block = document.querySelector('[data-product-block]');
  var priceEl = document.querySelector('.product-price');

  if (block) {
    // ---- Selector de formato: actualiza precio visible ----
    block.querySelectorAll('.option-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        block.querySelectorAll('.option-pill').forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        if (priceEl && pill.dataset.price) {
          var value = parseFloat(pill.dataset.price).toFixed(2).replace('.', ',');
          priceEl.childNodes[0].textContent = value + '\u00A0€ ';
        }
      });
    });

    // ---- Contador de cantidad ----
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
})();
