// ==========================================================================
// Año del copyright del pie de página — se actualiza solo cada año en vez
// de tener "© 2026" escrito a mano en las 29 páginas del sitio.
// ==========================================================================
(function () {
  var span = document.querySelector('.footer-bottom span');
  if (!span || span.textContent.indexOf('©') === -1) return;
  span.textContent = span.textContent.replace(/\d{4}/, new Date().getFullYear());
})();

// ==========================================================================
// Interacciones mínimas de la Home: menú de categorías en móvil.
// ==========================================================================
(function () {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('categoryNav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Cierra el menú al elegir una categoría (solo relevante en móvil)
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

// ==========================================================================
// Newsletter — se inyecta en el footer de todas las páginas (menos el panel
// de administración) sin tocar el HTML de cada una. Guarda el email en
// Firestore, colección "newsletter" (ver firestore.rules).
// ==========================================================================
(function () {
  if (document.getElementById('adminGuard')) return; // no en admin.html
  var footerBrand = document.querySelector('.footer-brand');
  if (!footerBrand) return;

  var wrap = document.createElement('div');
  wrap.className = 'newsletter-signup';
  wrap.innerHTML =
    '<h5 class="footer-heading">Novedades y ofertas</h5>' +
    '<p class="newsletter-text">Avísanos y te escribimos cuando lleguen títulos nuevos o haya alguna oferta.</p>' +
    '<form class="newsletter-form" id="newsletterForm">' +
      '<input type="email" name="email" placeholder="Tu correo electrónico" aria-label="Tu correo electrónico" required>' +
      '<button type="submit" class="btn btn--gold btn--sm">Avísame</button>' +
    '</form>' +
    '<p class="newsletter-msg" id="newsletterMsg" hidden></p>';
  footerBrand.appendChild(wrap);

  var form = document.getElementById('newsletterForm');
  var msg = document.getElementById('newsletterMsg');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var NEWSLETTER_URL = 'https://us-central1-libreria-tu-mayor-tesoro.cloudfunctions.net/suscribirNewsletter';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input[name="email"]');
    var email = input.value.trim();
    var btn = form.querySelector('button');

    msg.hidden = true;
    if (!EMAIL_RE.test(email)) {
      msg.textContent = 'Escribe un correo válido.';
      msg.className = 'newsletter-msg is-error';
      msg.hidden = false;
      return;
    }
    btn.disabled = true;

    function ok(texto) {
      form.reset();
      msg.textContent = texto;
      msg.className = 'newsletter-msg is-success';
      msg.hidden = false;
    }
    function fallo(texto) {
      msg.textContent = texto;
      msg.className = 'newsletter-msg is-error';
      msg.hidden = false;
    }

    // La Cloud Function guarda el alta y envía el correo de bienvenida (ver
    // "suscribirNewsletter" en functions/index.js).
    fetch(NEWSLETTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        return { status: r.status, data: data };
      });
    }).then(function (res) {
      if (res.status >= 200 && res.status < 300 && res.data.ok) {
        ok(res.data.yaSuscrito
          ? 'Este correo ya estaba apuntado. ¡Gracias!'
          : '¡Listo! Te hemos enviado un correo de confirmación.');
      } else if (res.status === 400 || res.status === 429) {
        fallo(res.data.error || 'No se ha podido guardar. Inténtalo de nuevo.');
      } else {
        throw new Error('HTTP ' + res.status);
      }
    }).catch(function (err) {
      // Si la función no está disponible (p. ej. aún no desplegada), no se
      // pierde el alta: se guarda directamente como antes, aunque sin correo.
      console.error('Newsletter: la función no respondió, se guarda sin correo', err);
      if (!window.fbDb) { fallo('No se ha podido guardar. Inténtalo de nuevo.'); return; }
      window.fbDb.collection('newsletter').add({
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function () {
        ok('¡Listo! Te avisaremos por correo.');
      }).catch(function () {
        fallo('No se ha podido guardar. Inténtalo de nuevo.');
      });
    }).finally(function () {
      btn.disabled = false;
    });
  });
})();

// ==========================================================================
// Red de seguridad para las portadas de los libros
// --------------------------------------------------------------------------
// Las portadas se piden primero en .webp y solo caen al .jpg gracias al
// onerror="" de cada <img>. Si ese atributo no llega a ejecutarse (HTML
// cacheado antiguo, contenido inyectado, extensión del navegador…), la
// portada se queda rota. Este oyente global escucha los errores de carga de
// cualquier imagen de la página — en fase de captura, porque el evento
// "error" de <img> no burbujea — y reintenta con el .jpg original.
// ==========================================================================
(function () {
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;

    var src = img.getAttribute('src') || '';

    // 1er intento: .webp → .jpg
    if (/\.webp(\?|$)/i.test(src) && img.dataset.fallbackDone !== '1') {
      img.dataset.fallbackDone = '1';
      img.onerror = null;
      img.src = src.replace(/\.webp(\?|$)/i, '.jpg$1');
      return;
    }

    // 2º intento fallido: ocultamos el icono roto y dejamos el fondo limpio.
    img.classList.add('img-failed');
  }, true);
})();

// ==========================================================================
// Enlaces directos a las secciones de "Mi cuenta"
// --------------------------------------------------------------------------
// El menú de la cabecera enlaza a cuenta.html#pedidos, #deseos, etc.
// Aquí abrimos la pestaña correspondiente del panel de cuenta.
// ==========================================================================
(function () {
  function abrirPanelDesdeHash() {
    var hash = (window.location.hash || '').replace('#', '');
    if (!/^[a-z-]+$/.test(hash)) return;
    var btn = document.querySelector('[data-account-panel="' + hash + '"]');
    if (btn) btn.click();
  }

  if (document.querySelector('[data-account-panel]')) {
    abrirPanelDesdeHash();
    window.addEventListener('hashchange', abrirPanelDesdeHash);
    // El panel se rellena cuando Firebase confirma la sesión; reintentamos.
    setTimeout(abrirPanelDesdeHash, 800);
  }
})();

// ==========================================================================
// Enlace a "Pedidos personalizados" en el menú y en el pie
// --------------------------------------------------------------------------
// Se inyecta desde aquí para que aparezca en todas las páginas sin tener que
// editar el HTML de cada una. Si algún día lo pones a mano en el menú,
// borra este bloque para que no salga dos veces.
// ==========================================================================
(function () {
  if (document.getElementById('adminGuard')) return; // no en admin.html
  var URL_PERSONALIZADO = 'personalizado.html';
  var actual = window.location.pathname.split('/').pop();

  // --- Menú de categorías ---
  var lista = document.querySelector('.category-list');
  if (lista && !lista.querySelector('a[href="' + URL_PERSONALIZADO + '"]')) {
    var li = document.createElement('li');
    li.innerHTML = '<a href="' + URL_PERSONALIZADO + '">Personalizados</a>';
    if (actual === URL_PERSONALIZADO) li.querySelector('a').classList.add('is-active');
    lista.appendChild(li);
  }

  // --- Pie de página (columna "Institucional") ---
  var footerList = document.querySelector('.footer-links');
  if (footerList && !footerList.querySelector('a[href="' + URL_PERSONALIZADO + '"]')) {
    var liPie = document.createElement('li');
    liPie.innerHTML = '<a href="' + URL_PERSONALIZADO + '">Pedidos personalizados</a>';
    footerList.appendChild(liPie);
  }

  // --- Pie de página: "Seguimiento de pedido" en la columna "Ayuda" ---
  // La columna "Ayuda" es la SEGUNDA lista ".footer-links" de la página
  // (la primera es "Institucional", donde acabamos de meter el enlace de
  // arriba), así que la buscamos explícitamente por su encabezado.
  var URL_SEGUIMIENTO = 'seguimiento.html';
  document.querySelectorAll('.footer-col').forEach(function (col) {
    var heading = col.querySelector('.footer-heading');
    var lista = col.querySelector('.footer-links');
    if (!heading || !lista) return;
    if (heading.textContent.trim() !== 'Ayuda') return;
    if (lista.querySelector('a[href="' + URL_SEGUIMIENTO + '"]')) return;
    var li = document.createElement('li');
    li.innerHTML = '<a href="' + URL_SEGUIMIENTO + '">Seguimiento de pedido</a>';
    lista.insertBefore(li, lista.firstChild);
  });
})();


// ==========================================================================
// Pestaña activa del menú
// --------------------------------------------------------------------------
// "Todas las categorías" venía marcada como activa a mano en el HTML de casi
// todas las páginas (inicio, carrito, cuenta, 404...). Aquí se deja activa solo
// cuando de verdad estás en el catálogo.
// ==========================================================================
(function () {
  var primero = document.querySelector('.category-list > li:first-child > a');
  if (!primero || primero.getAttribute('href') !== 'categoria.html') return;
  var enCatalogo = window.location.pathname.split('/').pop() === 'categoria.html';
  primero.classList.toggle('is-active', enCatalogo);
})();
