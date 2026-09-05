// ==========================================================================
// Consentimiento de cookies — bloquea Google Tag Manager hasta que el
// usuario acepte. Solo se cargan cookies de analítica si hay consentimiento
// explícito (LOPDGDD / ePrivacy). Si rechaza, no se carga GTM en absoluto.
// ==========================================================================
(function () {
  var STORAGE_KEY = 'cookie_consent'; // 'accepted' | 'rejected'
  var GTM_ID = 'GTM-WBV9C38V';

  function loadGTM() {
    if (window.__gtmLoaded) return;
    window.__gtmLoaded = true;
    (function (w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', GTM_ID);
  }

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function showBanner() {
    var wrap = document.createElement('div');
    wrap.id = 'cookieBanner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Aviso de cookies');
    wrap.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--navy-deep, #1f2b45);color:var(--parchment, #f7f2e7);padding:18px 20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center;box-shadow:0 -4px 18px rgba(0,0,0,.18);font-family:inherit;';
    wrap.innerHTML =
      '<p style="margin:0;flex:1 1 320px;font-size:0.92rem;line-height:1.5;max-width:640px;">' +
        'Usamos cookies propias y de analítica (Google Analytics) para entender cómo se usa la web. Puedes aceptarlas o rechazarlas — ' +
        '<a href="privacidad.html" style="color:inherit;text-decoration:underline;">más información</a>.' +
      '</p>' +
      '<div style="display:flex;gap:10px;flex:0 0 auto;">' +
        '<button type="button" id="cookieRejectBtn" style="background:transparent;border:1px solid currentColor;color:inherit;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.9rem;">Rechazar</button>' +
        '<button type="button" id="cookieAcceptBtn" style="background:var(--gold, #c9a15a);border:none;color:var(--navy-deep, #1f2b45);padding:9px 18px;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.9rem;">Aceptar</button>' +
      '</div>';
    document.body.appendChild(wrap);

    document.getElementById('cookieAcceptBtn').addEventListener('click', function () {
      setConsent('accepted');
      wrap.remove();
      loadGTM();
    });
    document.getElementById('cookieRejectBtn').addEventListener('click', function () {
      setConsent('rejected');
      wrap.remove();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var consent = getConsent();
    if (consent === 'accepted') {
      loadGTM();
    } else if (consent !== 'rejected') {
      showBanner();
    }
    // Si rechazó, no se hace nada: no se carga GTM esta sesión ni las siguientes hasta que cambie de opinión.
  });

  // Permite reabrir el banner desde el enlace "Cookies" del footer.
  window.reopenCookieBanner = function (e) {
    if (e) e.preventDefault();
    if (!document.getElementById('cookieBanner')) showBanner();
  };
})();
