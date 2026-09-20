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
//
// NUEVO — control manual desde fuera de la ficha (sin entrar al libro):
//   · deslizar con el dedo (móvil) o arrastrar con el ratón: la portada
//     sigue al dedo y, al soltar, se queda con la siguiente/anterior
//   · dos dedos en el trackpad (gesto horizontal) o rueda lateral
//   · flechas ‹ › al pasar el ratón (escritorio) y flechas del teclado
//   · un toque/clic normal sigue abriendo la ficha; si se ha arrastrado,
//     NO se abre (así no entras al libro sin querer al deslizar)
//   · funciona con cualquier número de portadas: cuando publiques más
//     portadas en "covers" (js/books-data.js) se adapta solo. Hasta 6 se
//     muestran puntitos; con más, un contador "3 / 8".
// ==========================================================================
window.CoverCarousel = (function () {
  var INTERVAL_MS = 4200;   // tiempo que se ve cada portada
  var STAGGER_MS = 650;     // desfase entre tarjetas
  var MANUAL_PAUSE_MS = 6000; // pausa extra del auto-giro tras tocar tú
  var MAX_DOTS = 6;         // a partir de aquí se usa contador en vez de puntitos
  var SLIDE_MS = 280;       // duración del deslizamiento al soltar
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

    var inst = {
      card: card, link: link, imgs: imgs, covers: covers,
      index: 0, timer: null, visible: false, paused: false,
      busy: false, dots: [], counter: null, lastDragEnd: 0
    };

    if (covers.length <= MAX_DOTS) {
      var dots = document.createElement('div');
      dots.className = 'cover-swap-dots';
      dots.setAttribute('role', 'tablist');
      dots.setAttribute('aria-label', 'Diseños de portada disponibles');
      link.appendChild(dots);

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
          if (inst.busy) return;
          show(inst, i);
          restart(inst, MANUAL_PAUSE_MS);
        });
        dots.appendChild(dot);
      });
      inst.dots = Array.prototype.slice.call(dots.children);
    } else {
      // Muchas portadas: un contador discreto es más limpio que 10 puntitos.
      var counter = document.createElement('span');
      counter.className = 'cover-swap-count';
      counter.textContent = '1 / ' + covers.length;
      link.appendChild(counter);
      inst.counter = counter;
    }

    // Flechas ‹ › (solo se ven con ratón; en móvil se desliza con el dedo).
    [['prev', -1, 'Portada anterior', 'M15 18l-6-6 6-6'], ['next', 1, 'Portada siguiente', 'M9 18l6-6-6-6']]
      .forEach(function (def) {
        var arrow = document.createElement('button');
        arrow.type = 'button';
        arrow.className = 'cover-swap-arrow cover-swap-arrow--' + def[0];
        arrow.setAttribute('aria-label', def[2]);
        arrow.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + def[3] + '"/></svg>';
        arrow.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          slideBy(inst, def[1]);
          restart(inst, MANUAL_PAUSE_MS);
        });
        link.appendChild(arrow);
      });

    attachGestures(inst);

    ['mouseenter', 'focusin', 'touchstart'].forEach(function (evt) {
      card.addEventListener(evt, function () { inst.paused = true; stop(inst); }, { passive: true });
    });
    ['mouseleave', 'focusout'].forEach(function (evt) {
      card.addEventListener(evt, function () { inst.paused = false; start(inst); });
    });
    // En pantallas táctiles no hay "mouseleave" fiable: al levantar el dedo
    // se reanuda el giro automático tras una pausa.
    ['touchend', 'touchcancel'].forEach(function (evt) {
      card.addEventListener(evt, function () { inst.paused = false; restart(inst, MANUAL_PAUSE_MS); }, { passive: true });
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
    if (inst.counter) inst.counter.textContent = (inst.index + 1) + ' / ' + inst.covers.length;
    var cover = inst.covers[inst.index];
    inst.card.dataset.coverStyle = cover.style;
    inst.card.dataset.coverFile = cover.file;
    inst.card.dataset.coverLabel = cover.short;
  }

  function start(inst, delay) {
    if (reduceMotion || inst.timer || inst.busy || !inst.visible || inst.paused || document.hidden) return;
    inst.timer = setTimeout(function () {
      inst.timer = null;
      show(inst, inst.index + 1);
      start(inst);
    }, INTERVAL_MS + (delay || 0));
  }

  function stop(inst) {
    if (inst.timer) { clearTimeout(inst.timer); inst.timer = null; }
  }

  function restart(inst, extraDelay) {
    stop(inst);
    start(inst, extraDelay);
  }

  // ---- Deslizar a mano ----------------------------------------------------
  // Las imágenes están apiladas (todas en el mismo sitio). Al arrastrar, la
  // portada activa se desplaza con el dedo y la vecina entra desde el lado
  // contrario; al soltar, se completa o se vuelve atrás según cuánto se haya
  // arrastrado (o la velocidad del gesto).
  function neighborIndex(inst, dir) {
    return (inst.index + dir + inst.covers.length) % inst.covers.length;
  }

  function place(img, x, transition) {
    img.style.transition = transition || 'none';
    img.style.opacity = '1';
    img.style.zIndex = '1';
    img.style.transform = 'translate3d(' + x + 'px,0,0)';
  }

  function hide(img) {
    img.style.transition = 'none';
    img.style.opacity = '0';
    img.style.zIndex = '';
    img.style.transform = '';
  }

  function clearInline(inst) {
    inst.imgs.forEach(function (img) {
      img.style.transition = 'none';
      img.style.opacity = '';
      img.style.zIndex = '';
      img.style.transform = '';
    });
  }

  // Termina un deslizamiento: limpia estilos en línea y fija la portada.
  function finishSlide(inst, targetIndex) {
    clearInline(inst);
    if (targetIndex !== null && targetIndex !== inst.index) show(inst, targetIndex);
    void inst.link.offsetWidth; // fuerza el repintado sin transición
    inst.imgs.forEach(function (img) { img.style.transition = ''; });
    inst.link.classList.remove('is-dragging');
    inst.busy = false;
    inst.dragDir = 0;
    start(inst, MANUAL_PAUSE_MS);
  }

  function settle(inst, dir, commit) {
    var width = inst.width || inst.link.getBoundingClientRect().width;
    var active = inst.imgs[inst.index];
    var neighbor = inst.imgs[neighborIndex(inst, dir)];
    var t = reduceMotion ? 'none' : 'transform ' + SLIDE_MS + 'ms cubic-bezier(0.22, 0.7, 0.2, 1)';
    var target = commit ? neighborIndex(inst, dir) : null;

    if (commit) {
      place(active, -dir * width, t);
      place(neighbor, 0, t);
    } else {
      place(active, 0, t);
      place(neighbor, dir * width, t);
    }
    setTimeout(function () { finishSlide(inst, target); }, reduceMotion ? 0 : SLIDE_MS + 30);
  }

  // Cambio animado a la portada vecina (flechas, teclado, rueda).
  function slideBy(inst, dir) {
    if (inst.busy || inst.covers.length < 2) return;
    inst.busy = true;
    stop(inst);
    inst.width = inst.link.getBoundingClientRect().width;
    var active = inst.imgs[inst.index];
    var neighbor = inst.imgs[neighborIndex(inst, dir)];
    place(active, 0);
    place(neighbor, dir * inst.width);
    void inst.link.offsetWidth;
    settle(inst, dir, true);
  }

  function attachGestures(inst) {
    var link = inst.link;
    var tracking = false, dragging = false, pid = null;
    var startX = 0, startY = 0, startT = 0, dx = 0;

    link.classList.add('cover-swap--interactive');

    // Sin esto el navegador intenta arrastrar el enlace/la imagen como un
    // "elemento" y el gesto no llega a funcionar con el ratón.
    link.addEventListener('dragstart', function (e) { e.preventDefault(); });
    inst.imgs.forEach(function (img) { img.draggable = false; });

    link.addEventListener('pointerdown', function (e) {
      if (inst.busy) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tracking = true;
      dragging = false;
      pid = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startT = Date.now();
      dx = 0;
    });

    link.addEventListener('pointermove', function (e) {
      if (!tracking || e.pointerId !== pid) return;
      var mx = e.clientX - startX;
      var my = e.clientY - startY;

      if (!dragging) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        // Gesto más vertical que horizontal: es scroll de la página.
        if (Math.abs(my) > Math.abs(mx)) { tracking = false; return; }
        dragging = true;
        inst.busy = true;
        inst.dragDir = 0;
        inst.width = link.getBoundingClientRect().width;
        stop(inst);
        link.classList.add('is-dragging');
        try { link.setPointerCapture(pid); } catch (err) {}
      }

      var width = inst.width;
      dx = Math.max(-width, Math.min(width, mx));
      var dir = dx < 0 ? 1 : -1;

      // Si el dedo cambia de sentido, la vecina anterior se esconde.
      if (inst.dragDir && inst.dragDir !== dir) hide(inst.imgs[neighborIndex(inst, inst.dragDir)]);
      inst.dragDir = dir;

      place(inst.imgs[inst.index], dx);
      place(inst.imgs[neighborIndex(inst, dir)], dx + dir * width);
    });

    function end(e, cancelled) {
      if (!tracking || (e && e.pointerId !== pid)) return;
      tracking = false;
      if (!dragging) return;
      dragging = false;
      try { link.releasePointerCapture(pid); } catch (err) {}

      inst.lastDragEnd = Date.now();
      var elapsed = Math.max(1, Date.now() - startT);
      var fast = Math.abs(dx) / elapsed > 0.45 && Math.abs(dx) > 24;
      var far = Math.abs(dx) > inst.width * 0.22;
      var dir = inst.dragDir || (dx < 0 ? 1 : -1);
      settle(inst, dir, !cancelled && (far || fast));
    }
    link.addEventListener('pointerup', function (e) { end(e, false); });
    link.addEventListener('pointercancel', function (e) { end(e, true); });

    // Tras arrastrar, el navegador dispara un "click" sobre el enlace: lo
    // anulamos para no entrar en la ficha sin querer.
    link.addEventListener('click', function (e) {
      if (Date.now() - inst.lastDragEnd < 400) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Teclado: con la portada enfocada, ← y → cambian de diseño.
    link.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        slideBy(inst, e.key === 'ArrowRight' ? 1 : -1);
        restart(inst, MANUAL_PAUSE_MS);
      }
    });

    // Trackpad (dos dedos en horizontal) o rueda lateral del ratón.
    var wheelAcc = 0, wheelLock = false, wheelReset = null;
    link.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // scroll vertical normal
      e.preventDefault();
      if (wheelLock) return;
      wheelAcc += e.deltaX;
      clearTimeout(wheelReset);
      wheelReset = setTimeout(function () { wheelAcc = 0; }, 180);
      if (Math.abs(wheelAcc) > 40) {
        var dir = wheelAcc > 0 ? 1 : -1;
        wheelAcc = 0;
        wheelLock = true;
        setTimeout(function () { wheelLock = false; }, 520);
        slideBy(inst, dir);
        restart(inst, MANUAL_PAUSE_MS);
      }
    }, { passive: false });
  }

  document.addEventListener('visibilitychange', function () {
    instances.forEach(function (inst) {
      if (document.hidden) stop(inst); else start(inst);
    });
  });

  function init(root) {
    // Si alguna sección se ha repintado, descarta las tarjetas que ya no están.
    instances = instances.filter(function (inst) {
      if (document.body.contains(inst.card)) return true;
      stop(inst);
      if (observer) observer.unobserve(inst.card);
      return false;
    });
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
