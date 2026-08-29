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
