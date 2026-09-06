// ==========================================================================
// Lista de deseos — guardada en Firestore (colección "deseos", 1 documento
// por usuario). Requiere sesión iniciada: si el visitante no ha iniciado
// sesión, se le invita a hacerlo. Funciona en cualquier página que incluya
// este script después de js/auth.js: home, catálogo, ficha de producto y
// el panel "Lista de deseos" de Mi cuenta.
// ==========================================================================
window.Wishlist = (function () {
  var COLLECTION = 'deseos';
  var currentUser = null;
  var ids = [];
  var ready = false;

  function refreshButtons() {
    document.querySelectorAll('[data-fav-toggle]').forEach(function (btn) {
      var active = ids.indexOf(btn.dataset.id) !== -1;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', active ? 'Quitar de mi lista de deseos' : 'Añadir a mi lista de deseos');
    });
  }

  function notify() {
    refreshButtons();
    document.dispatchEvent(new CustomEvent('wishlist:change'));
  }

  function loadFromFirestore(uid) {
    if (!window.fbDb) return Promise.resolve([]);
    return window.fbDb.collection(COLLECTION).doc(uid).get().then(function (doc) {
      ids = (doc.exists && doc.data().items) || [];
      ready = true;
      notify();
      return ids;
    }).catch(function (err) {
      console.error('Error al cargar la lista de deseos', err);
    });
  }

  function toggle(id) {
    if (!currentUser) {
      if (window.confirm('Inicia sesión para guardar libros en tu lista de deseos. ¿Quieres ir a Mi cuenta?')) {
        window.location.href = 'cuenta.html';
      }
      return Promise.resolve();
    }
    var isActive = ids.indexOf(id) !== -1;
    ids = isActive ? ids.filter(function (i) { return i !== id; }) : ids.concat([id]);
    notify(); // actualización optimista
    return window.fbDb.collection(COLLECTION).doc(currentUser.uid)
      .set({ items: ids }, { merge: true })
      .catch(function (err) {
        console.error('Error al guardar la lista de deseos', err);
      });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-fav-toggle]') : null;
    if (!btn) return;
    e.preventDefault();
    toggle(btn.dataset.id);
  });

  function init() {
    if (typeof firebase === 'undefined' || !window.fbAuth) { setTimeout(init, 60); return; }
    window.fbAuth.onAuthStateChanged(function (user) {
      currentUser = user;
      if (user) {
        loadFromFirestore(user.uid);
      } else {
        ids = [];
        ready = true;
        notify();
      }
    });
  }
  init();

  return {
    has: function (id) { return ids.indexOf(id) !== -1; },
    getIds: function () { return ids.slice(); },
    isReady: function () { return ready; },
    isLoggedIn: function () { return !!currentUser; },
    toggle: toggle,
    refresh: refreshButtons
  };
})();
