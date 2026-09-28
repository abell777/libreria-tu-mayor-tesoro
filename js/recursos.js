// ==========================================================================
// Recursos de lectura — recursos.html
// --------------------------------------------------------------------------
// Dos herramientas:
//   1) Planificador de lectura: con las páginas del libro, los minutos que
//      el lector puede dedicar al día y los días que leerá por semana,
//      calcula cuándo lo terminará y qué ritmo diario le toca.
//   2) Plantillas imprimibles (diario de lectura y ficha de síntesis): se
//      montan aquí como HTML y se imprimen con el propio navegador, así no
//      hace falta alojar ningún PDF ni depender de nada externo.
//
// El selector de libro se rellena solo con el catálogo (js/books-data.js).
// Si algún libro lleva el campo opcional "pages" (número de páginas), se
// usa automáticamente; si no, el lector lo escribe a mano.
// ==========================================================================
(function () {
  // ---------------------------------------------------------------- 1. Planificador
  var bookSel = document.getElementById('plannerBook');
  var pagesEl = document.getElementById('plannerPages');
  var minutesEl = document.getElementById('plannerMinutes');
  var daysEl = document.getElementById('plannerDays');
  var speedEl = document.getElementById('plannerSpeed');
  var resultEl = document.getElementById('plannerResult');

  if (bookSel && window.BOOKS) {
    var titulosVistos = {};
    window.BOOKS.forEach(function (b) {
      if (titulosVistos[b.title]) return;
      titulosVistos[b.title] = true;
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.title + (typeof b.pages === 'number' ? ' (' + b.pages + ' págs.)' : '');
      if (typeof b.pages === 'number') opt.dataset.pages = b.pages;
      bookSel.appendChild(opt);
    });
    bookSel.addEventListener('change', function () {
      var opt = bookSel.options[bookSel.selectedIndex];
      if (opt && opt.dataset.pages) pagesEl.value = opt.dataset.pages;
      calcular();
    });
  }

  function calcular() {
    if (!resultEl) return;
    var paginas = Math.max(1, parseInt(pagesEl.value, 10) || 0);
    var minutos = Math.max(1, parseInt(minutesEl.value, 10) || 0);
    var diasSemana = parseInt(daysEl.value, 10) || 7;
    var pagsPorMinuto = parseFloat(speedEl.value) || 2.2;

    var paginasDia = Math.max(1, Math.round(minutos * pagsPorMinuto));
    var sesiones = Math.ceil(paginas / paginasDia);
    var semanas = sesiones / diasSemana;
    var fin = new Date();
    // Avanza día a día, saltando los días en que no se lee.
    var leidas = 0;
    var guardia = 0;
    while (leidas < paginas && guardia < 4000) {
      guardia++;
      fin.setDate(fin.getDate() + 1);
      var diaSemana = fin.getDay(); // 0 domingo … 6 sábado
      var leeHoy = diasSemana === 7 ||
        (diasSemana === 6 && diaSemana !== 6) ||
        (diasSemana === 5 && diaSemana >= 1 && diaSemana <= 5) ||
        (diasSemana === 3 && (diaSemana === 1 || diaSemana === 3 || diaSemana === 5));
      if (leeHoy) leidas += paginasDia;
    }

    var textoSemanas = semanas < 1.2
      ? 'menos de una semana y media'
      : (semanas < 8 ? Math.round(semanas) + ' semanas' : Math.round(semanas / 4.3) + ' meses');

    resultEl.innerHTML =
      '<div class="planner-headline">' +
        '<span class="planner-big">' + paginasDia + '</span>' +
        '<span class="planner-big-label">páginas al día<br><small>' + minutos + ' min de lectura</small></span>' +
      '</div>' +
      '<ul class="planner-facts">' +
        '<li><span>Sesiones de lectura</span><span>' + sesiones + '</span></li>' +
        '<li><span>Tiempo total estimado</span><span>' + textoSemanas + '</span></li>' +
        '<li><span>Fecha aproximada de final</span><span>' + fin.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + '</span></li>' +
      '</ul>' +
      '<p class="planner-note">Cálculo orientativo: se estima a partir de tu ritmo de lectura. Si un capítulo te pide releerlo, reléelo — el plan está para ayudar, no para apretar.</p>';
  }

  [pagesEl, minutesEl, daysEl, speedEl].forEach(function (el) {
    if (el) {
      el.addEventListener('input', calcular);
      el.addEventListener('change', calcular);
    }
  });
  calcular();

  // ---------------------------------------------------------- 2. Imprimibles
  var printable = document.getElementById('printable');
  var sheet = document.getElementById('printableSheet');
  var titleEl = document.getElementById('printableTitle');

  function linea(n) {
    return new Array(n + 1).join('<span class="ruled-line"></span>');
  }

  // Si hay libro elegido se imprime su dato subrayado; si no, la línea en blanco.
  function campo(valor, corto) {
    return valor
      ? '<span class="ruled-line sheet-fill' + (corto ? ' short' : '') + '">' + escapeHTML(String(valor)) + '</span>'
      : '<span class="ruled-line' + (corto ? ' short' : '') + '"></span>';
  }

  var PLANTILLAS = {
    diario: {
      nombre: 'Diario de lectura',
      html: function (b) {
        return '<header class="sheet-head">' +
          '<p class="sheet-brand">Librería tu mayor tesoro</p>' +
          '<h1>Diario de lectura</h1>' +
          '<div class="sheet-meta">' +
            '<p><span>Libro</span>' + campo(b && b.title) + '<span>Páginas</span>' + campo(b && b.pages, true) + '</p>' +
            '<p><span>Capítulo</span><span class="ruled-line"></span><span>Fecha</span><span class="ruled-line short"></span></p>' +
          '</div>' +
        '</header>' +
        '<section class="sheet-block"><h2>El pasaje o la cita que me ha marcado</h2>' + linea(4) + '</section>' +
        '<section class="sheet-block"><h2>Qué me ha dicho a mí</h2>' + linea(5) + '</section>' +
        '<section class="sheet-block"><h2>Una cosa concreta que quiero cambiar o hacer</h2>' + linea(3) + '</section>' +
        '<section class="sheet-block"><h2>Mi oración a partir de esta lectura</h2>' + linea(4) + '</section>' +
        '<footer class="sheet-foot">libreriatumayortesoro.com · Imprime una hoja por capítulo</footer>';
      }
    },
    sintesis: {
      nombre: 'Ficha de síntesis',
      html: function (b) {
        return '<header class="sheet-head">' +
          '<p class="sheet-brand">Librería tu mayor tesoro</p>' +
          '<h1>Ficha de síntesis</h1>' +
          '<div class="sheet-meta">' +
            '<p><span>Libro</span>' + campo(b && b.title) + '<span>Páginas</span>' + campo(b && b.pages, true) + '</p>' +
            '<p><span>Autor</span>' + campo(b && b.author) + '<span>Terminado el</span><span class="ruled-line short"></span></p>' +
          '</div>' +
        '</header>' +
        '<section class="sheet-block"><h2>En una frase, de qué va este libro</h2>' + linea(2) + '</section>' +
        '<section class="sheet-block"><h2>Las tres citas que quiero recordar</h2>' +
          '<p class="sheet-num">1.</p>' + linea(2) +
          '<p class="sheet-num">2.</p>' + linea(2) +
          '<p class="sheet-num">3.</p>' + linea(2) +
        '</section>' +
        '<section class="sheet-block"><h2>Qué me llevo para mi vida</h2>' + linea(4) + '</section>' +
        '<section class="sheet-block sheet-block--split">' +
          '<div><h2>A quién se lo recomendaría</h2>' + linea(2) + '</div>' +
          '<div><h2>Lo volvería a leer</h2><p class="sheet-boxes">Sí ☐&nbsp;&nbsp;No ☐&nbsp;&nbsp;Por partes ☐</p></div>' +
        '</section>' +
        '<footer class="sheet-foot">libreriatumayortesoro.com · Guárdala con el libro o en tu libreta de notas</footer>';
      }
    }
  };

  var plantillaActual = null;

  // Selector "Rellenar con el libro" dentro de la barra de la vista previa.
  var bar = printable ? printable.querySelector('.printable-bar') : null;
  var pickSel = null;
  if (bar && window.BOOKS) {
    pickSel = document.createElement('select');
    pickSel.className = 'printable-pick';
    pickSel.setAttribute('aria-label', 'Rellenar la ficha con un libro');
    pickSel.innerHTML = '<option value="">Rellenar con un libro…</option>';
    var vistos = {};
    window.BOOKS.forEach(function (b) {
      if (b.category === 'biblias' || vistos[b.title]) return;
      vistos[b.title] = true;
      var o = document.createElement('option');
      o.value = b.id;
      o.textContent = b.title + (typeof b.pages === 'number' ? ' (' + b.pages + ' págs.)' : '');
      pickSel.appendChild(o);
    });
    var titleP = bar.querySelector('#printableTitle');
    if (titleP) titleP.insertAdjacentElement('afterend', pickSel);
    pickSel.addEventListener('change', function () { pintar(); });
  }

  function libroElegido() {
    if (!pickSel || !pickSel.value) return null;
    return window.BOOKS.filter(function (b) { return b.id === pickSel.value; })[0] || null;
  }

  function pintar() {
    var pl = PLANTILLAS[plantillaActual];
    if (!pl || !sheet) return;
    sheet.innerHTML = pl.html(libroElegido());
  }

  // Cruz de cierre, siempre visible arriba a la derecha (también en móvil).
  var xBtn = null;
  if (printable) {
    xBtn = document.createElement('button');
    xBtn.type = 'button';
    xBtn.className = 'printable-x';
    xBtn.setAttribute('aria-label', 'Cerrar la vista previa');
    xBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    printable.appendChild(xBtn);
  }

  function cerrar() {
    if (printable) printable.hidden = true;
    document.body.classList.remove('printable-open');
  }

  Array.prototype.slice.call(document.querySelectorAll('[data-print-template]')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var plantilla = PLANTILLAS[btn.dataset.printTemplate];
      if (!plantilla || !printable || !sheet) return;
      plantillaActual = btn.dataset.printTemplate;
      if (pickSel) pickSel.value = '';
      pintar();
      if (titleEl) titleEl.textContent = plantilla.nombre + ' — vista previa';
      printable.hidden = false;
      printable.scrollTop = 0;
      document.body.classList.add('printable-open');
    });
  });

  if (xBtn) xBtn.addEventListener('click', cerrar);
  if (printable) {
    printable.addEventListener('click', function (e) { if (e.target === printable) cerrar(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !printable.hidden) cerrar();
    });
  }

  var go = document.getElementById('printableGo');
  if (go) go.addEventListener('click', function () { window.print(); });
  var close = document.getElementById('printableClose');
  if (close) close.addEventListener('click', cerrar);
})();
