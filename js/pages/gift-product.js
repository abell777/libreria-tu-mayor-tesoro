// ==========================================================================
// "Regala con propósito" — bloque de la ficha de producto
// --------------------------------------------------------------------------
// DESACTIVADO TEMPORALMENTE (mientras el plan de envoltorio/dedicatoria/
// exlibris/funda todavía no está en marcha): ya no se pueden pedir estos
// extras, así que aquí NO se pinta el panel de opciones ni se calcula nada.
//
// Se deja, a propósito, el apartado con su título y su flecha debajo de los
// botones de compra (mismo aspecto de siempre), pero al pulsarlo no pasa
// nada: no se despliega ningún panel. Así no desaparece de golpe el bloque
// de la ficha, pero tampoco se puede seleccionar ni comprar ningún extra.
//
// Para reactivarlo cuando el plan esté listo: recupera la versión anterior
// de este archivo (con el <div class="gift-panel">... y toda la lógica de
// checkboxes/textos/total) del historial, o pide que te la vuelva a poner.
// ==========================================================================
(function () {
  var addBtn = document.getElementById('addToCartBtn');
  var actions = document.querySelector('.product-actions');
  if (!addBtn || !actions || !window.GIFT_EXTRAS) return;

  // En un libro que todavía no está a la venta no tiene sentido mostrarlo.
  if (addBtn.disabled) return;

  var box = document.createElement('section');
  box.className = 'gift-box';
  box.innerHTML =
    '<button type="button" class="gift-toggle" aria-expanded="false" aria-disabled="true">' +
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
    '</button>';

  actions.insertAdjacentElement('afterend', box);

  // A propósito, sin listener de click ni panel: el botón se ve exactamente
  // igual (con su flecha), pero no abre nada.
})();
