// ==========================================================================
// Autenticación compartida (Firebase) — sesión y estado del icono "Cuenta"
// en cualquier página. La lógica propia de formularios vive en
// js/account.js (solo se usa en cuenta.html).
// ==========================================================================
(function () {
  if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') return;

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  window.fbAuth = auth;
  window.fbDb = db;

  if (typeof emailjs !== 'undefined' && typeof emailjsConfig !== 'undefined' && emailjsConfig.publicKey) {
    emailjs.init(emailjsConfig.publicKey);
  }

  var googleProvider = new firebase.auth.GoogleAuthProvider();

  window.authRegister = function (nombre, email, password) {
    return auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
      return cred.user.updateProfile({ displayName: nombre });
    });
  };
  window.authLogin = function (email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  };
  window.authGoogleLogin = function () {
    return auth.signInWithPopup(googleProvider);
  };
  window.authLogout = function () {
    return auth.signOut();
  };

  // Refleja el estado de sesión en el icono de cuenta del header, en todas las páginas.
  auth.onAuthStateChanged(function (user) {
    document.querySelectorAll('[data-account-link]').forEach(function (el) {
      if (user) {
        el.setAttribute('aria-label', 'Mi cuenta (' + (user.displayName || user.email) + ')');
        el.classList.add('is-logged-in');
      } else {
        el.setAttribute('aria-label', 'Iniciar sesión');
        el.classList.remove('is-logged-in');
      }
    });
    if (typeof window.onAuthReady === 'function') window.onAuthReady(user);
  });
})();
