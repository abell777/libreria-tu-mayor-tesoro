// ==========================================================================
// Carrusel automático de portadas en las tarjetas de libro
// --------------------------------------------------------------------------
// Algunos libros son el MISMO libro con dos diseños de cubierta distintos
// (ver "covers" en js/books-data.js). En lugar de duplicar el producto,
// la tarjeta va alternando las portadas sola, con una transición suave,
// para que el cliente vea las dos opciones antes de entrar en la ficha.
//
// Funciona en cualquier página que pinte tarjetas .book-card con
// data-product-id: home (destacados), catálogo, relacionados y "vistos
// recientemente". No hace falta configurar nada: se ejecuta solo al cargar
// y también se puede volver a lanzar con window.CoverCarousel.init() si
// alguna sección se repinta por JavaScript.
//
// Detalles pensados para que no moleste ni gaste batería:
//   · solo rota cuando la tarjeta está visible en pantalla (IntersectionObserver)
//   · se para al pasar el ratón o el dedo por encima (y al enfocar con teclado)
//   · se para si la pestaña del navegador no está activa
//   · respeta "prefiero menos animaciones" del sistema: entonces no rota
//     sola, pero el cliente puede cambiar de portada con los puntitos
//   · cada tarjeta arranca con un pequeño desfase, para que no cambien
//     todas a la vez (queda mucho más natural)
// ==========================================================================
window.CoverCarousel = (function () {
  var INTERVAL_MS = 4200;   // tiempo que se ve cada portada
  var STAGGER_MS = 650;     // desfase entre tarjetas
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  var instances = [];
  var staggerIndex = 0;

  function buildCard(card) {
    if (card.dataset.coverCarousel === 'ready') return;

    var id = card.dataset.productId;
    if (!id || !window.BOOKS || !window.BooksCatalog) return;
    var book = window.BooksCatalog.getById(id);
    if (!book) return;

    var covers = window.bookCovers(book);
    // Guarda siempre la portada activa en la propia tarjeta: el botón
    // "Añadir" (js/cart.js) la lee para meter en el carrito exactamente la
    // versión que el cliente está viendo en ese momento.
    card.dataset.coverStyle = covers[0].style;
    card.dataset.coverFile = covers[0].file;
    card.dataset.coverLabel = covers[0].short;

    if (covers.length < 2) {
      card.dataset.coverCarousel = 'ready';
      return;
    }

    var link = card.querySelector('.book-cover');
    var baseImg = link ? link.querySelector('img') : null;
    if (!link || !baseImg) return;

    link.classList.add('cover-swap');

    var alt = baseImg.getAttribute('alt') || ('Portada de «' + book.title + '»');
    var imgs = [baseImg];
    baseImg.classList.add('cover-swap-img', 'is-active');
    baseImg.setAttribute('alt', alt + ' — ' + covers[0].short.toLowerCase());

    // Las portadas alternativas se añaden encima, apiladas y transparentes.
    for (var i = 1; i < covers.length; i++) {
      var img = document.createElement('img');
      img.className = 'cover-swap-img';
      img.src = window.toWebp ? window.toWebp(covers[i].file) : covers[i].file;
      img.setAttribute('data-fallback', covers[i].file);
      img.onerror = function () { this.onerror = null; this.src = this.getAttribute('data-fallback'); };
      img.alt = alt + ' — ' + covers[i].short.toLowerCase();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 400;
      img.height = 600;
      link.appendChild(img);
      imgs.push(img);
    }

    // Aviso discreto de que hay más de un diseño + puntitos para cambiar
    // a mano (también sirven de indicador de en qué portada estamos).
    var note = document.createElement('span');
    note.className = 'cover-swap-note';
    note.innerHTML =
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="3" y="3" width="13" height="18" rx="2"/><path d="M8 21h10a3 3 0 0 0 3-3V7"/></svg>' +
      '<span>' + covers.length + ' portadas</span>';
    link.appendChild(note);

    var dots = document.createElement('div');
    dots.className = 'cover-swap-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Diseños de portada disponibles');
    link.appendChild(dots);

    var inst = {
      card: card, link: link, imgs: imgs, covers: covers,
      index: 0, timer: null, visible: false, paused: false
    };

    covers.forEach(function (cover, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'cover-swap-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Ver ' + cover.short.toLowerCase());
      dot.addEventListener('click', function (e) {
        // El contenedor es un enlace a la ficha: aquí solo cambiamos de
        // portada, no queremos navegar.
        e.preventDefault();
        e.stopPropagation();
        show(inst, i);
        restart(inst);
      });
      dots.appendChild(dot);
    });
    inst.dots = Array.prototype.slice.call(dots.children);

    ['mouseenter', 'focusin', 'touchstart'].forEach(function (evt) {
      card.addEventListener(evt, function () { inst.paused = true; stop(inst); }, { passive: true });
    });
    ['mouseleave', 'focusout'].forEach(function (evt) {
      card.addEventListener(evt, function () { inst.paused = false; start(inst); });
    });

    instances.push(inst);
    card.dataset.coverCarousel = 'ready';

    if (window.IntersectionObserver) {
      observer.observe(card);
    } else {
      inst.visible = true;
      start(inst, (staggerIndex++ % 6) * STAGGER_MS);
    }
  }

  var observer = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var inst = instances.filter(function (i) { return i.card === entry.target; })[0];
      if (!inst) return;
      inst.visible = entry.isIntersecting;
      if (entry.isIntersecting) start(inst, (staggerIndex++ % 6) * STAGGER_MS);
      else stop(inst);
    });
  }, { rootMargin: '80px' }) : null;

  function show(inst, index) {
    inst.index = (index + inst.covers.length) % inst.covers.length;
    inst.imgs.forEach(function (img, i) { img.classList.toggle('is-active', i === inst.index); });
    if (inst.dots) {
      inst.dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === inst.index);
        dot.setAttribute('aria-selected', i === inst.index ? 'true' : 'false');
      });
    }
    var cover = inst.covers[inst.index];
    inst.card.dataset.coverStyle = cover.style;
    inst.card.dataset.coverFile = cover.file;
    inst.card.dataset.coverLabel = cover.short;
  }

  function start(inst, delay) {
    if (reduceMotion || inst.timer || !inst.visible || inst.paused || document.hidden) return;
    inst.timer = setTimeout(function () {
      inst.timer = null;
      show(inst, inst.index + 1);
      start(inst);
    }, INTERVAL_MS + (delay || 0));
  }

  function stop(inst) {
    if (inst.timer) { clearTimeout(inst.timer); inst.timer = null; }
  }

  function restart(inst) {
    stop(inst);
    start(inst);
  }

  document.addEventListener('visibilitychange', function () {
    instances.forEach(function (inst) {
      if (document.hidden) stop(inst); else start(inst);
    });
  });

  function init(root) {
    var scope = root || document;
    Array.prototype.slice.call(scope.querySelectorAll('.book-card[data-product-id]')).forEach(buildCard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  // Si alguna sección se repinta más tarde (filtros, relacionados…), basta
  // con volver a llamar a init(): las tarjetas ya preparadas se ignoran.
  document.addEventListener('catalog:rendered', function () { init(); });

  return { init: init };
})();
