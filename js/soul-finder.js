// ==========================================================================
// "¿Qué busca tu alma hoy?" — tarjetas de la home
// --------------------------------------------------------------------------
// Pinta la sección #soulGrid (index.html) a partir de window.NEEDS
// (js/books-data.js). Cada tarjeta lleva al catálogo ya filtrado por esa
// necesidad: categoria.html?need=<slug>, donde js/shop.js marca solo el
// filtro correspondiente y cambia el título de la página.
//
// Para añadir, quitar o reordenar opciones NO hay que tocar este archivo ni
// el HTML: basta con editar window.NEEDS en js/books-data.js. Las opciones
// que no tengan ningún libro etiquetado se omiten solas, para que nunca
// haya una tarjeta que lleve a una página vacía.
// ==========================================================================
(function () {
  var grid = document.getElementById('soulGrid');
  if (!grid || !window.NEEDS || !window.BOOKS) return;

  // Un icono por necesidad. Si algún día añades una nueva y no le pones
  // icono aquí, se usa el de la hoja (DEFAULT_ICON) y no se rompe nada.
  var DEFAULT_ICON = '<path d="M12 21c-4-3-7-6.5-7-10a7 7 0 0 1 14 0c0 3.5-3 7-7 10z"/>';
  var ICONS = {
    'paz-interior': '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><circle cx="12" cy="12" r="1"/>',
    'consuelo-y-duelo': '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    'empezar-de-nuevo': '<path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 4v5h5"/>',
    'conocer-a-jesus': '<path d="M12 3v18"/><path d="M6 8h12"/>',
    'crecer-cada-dia': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    'familia-y-pareja': '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.9"/>',
    'criar-a-mis-hijos': '<circle cx="12" cy="7" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/>',
    'cuidar-mi-salud': '<path d="M3 12h4l2-5 3 10 2-5h7"/>',
    'dudas-de-fe': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.1 1-1.1 1.8v.4"/><circle cx="12" cy="17" r="0.6"/>',
    'estudiar-la-biblia': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    'entender-el-futuro': '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
    'servir-y-compartir': '<path d="M12 21s-7-4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 12c0 5-7 9-7 9z"/>',
    'primeros-pasos': '<polyline points="4 12 9 17 20 6"/>'
  };

  function countFor(slug) {
    return window.BOOKS.filter(function (b) {
      return (b.needs || []).indexOf(slug) !== -1;
    }).length;
  }

  grid.innerHTML = window.NEEDS.map(function (need) {
    var count = countFor(need.slug);
    if (!count) return '';
    return (
      '<a class="soul-card" href="categoria.html?need=' + need.slug + '">' +
        '<span class="soul-icon" aria-hidden="true">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
          (ICONS[need.slug] || DEFAULT_ICON) + '</svg>' +
        '</span>' +
        '<h3 class="soul-question">' + escapeHTML(need.question) + '</h3>' +
        '<p class="soul-desc">' + escapeHTML(need.desc) + '</p>' +
        '<span class="soul-count">' + count + (count === 1 ? ' libro' : ' libros') +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</span>' +
      '</a>'
    );
  }).join('');
})();
