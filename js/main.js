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
    if (!window.fbDb) return;

    btn.disabled = true;
    window.fbDb.collection('newsletter').add({
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      form.reset();
      msg.textContent = '¡Listo! Te avisaremos por correo.';
      msg.className = 'newsletter-msg is-success';
      msg.hidden = false;
    }).catch(function (err) {
      console.error('Error al guardar el email de newsletter', err);
      msg.textContent = 'No se ha podido guardar. Inténtalo de nuevo.';
      msg.className = 'newsletter-msg is-error';
      msg.hidden = false;
    }).finally(function () {
      btn.disabled = false;
    });
  });
})();
