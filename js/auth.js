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

  // App Check: solo se activa si has pegado tu clave de reCAPTCHA Enterprise
  // en js/config.js (ver las instrucciones allí). Envuelto en try/catch y en
  // una comprobación de que el SDK esté cargado, para que si algún día
  // quitas el script de App Check de una página suelta, esa página no se
  // rompa por ello — simplemente no queda protegida.
  if (typeof APPCHECK_SITE_KEY !== 'undefined' && APPCHECK_SITE_KEY && typeof firebase.appCheck === 'function') {
    try {
      var appCheckProvider = new firebase.appCheck.ReCaptchaEnterpriseProvider(APPCHECK_SITE_KEY);
      firebase.appCheck().activate(appCheckProvider, true);
    } catch (e) {
      console.error('No se pudo activar App Check', e);
    }
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  window.fbAuth = auth;
  window.fbDb = db;

  if (typeof emailjs !== 'undefined' && typeof emailjsConfig !== 'undefined' && emailjsConfig.publicKey) {
    emailjs.init(emailjsConfig.publicKey);
  }

  // Proveedores de acceso social. Cada uno se crea al usarlo.
  var providerFactories = {
    google: function () {
      var p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return p;
    },
    facebook: function () { return new firebase.auth.FacebookAuthProvider(); },
    apple: function () {
      var p = new firebase.auth.OAuthProvider('apple.com');
      p.addScope('email');
      p.addScope('name');
      return p;
    },
    microsoft: function () {
      var p = new firebase.auth.OAuthProvider('microsoft.com');
      p.setCustomParameters({ prompt: 'select_account' });
      return p;
    }
  };
  var providerIds = { 'google.com': 'google', 'facebook.com': 'facebook', 'apple.com': 'apple', 'microsoft.com': 'microsoft' };

  window.authRegister = function (nombre, email, password) {
    return auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
      return cred.user.updateProfile({ displayName: nombre });
    });
  };
  window.authLogin = function (email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  };

  // Acceso con Google / Facebook / Apple / Microsoft. Se abre una ventana
  // emergente (no saca al cliente de la web); si el navegador la bloquea, se
  // pasa automáticamente a la redirección en la misma pestaña.
  window.authProviderLogin = function (name) {
    var make = providerFactories[name];
    if (!make) return Promise.reject({ code: 'auth/operation-not-allowed' });
    var provider = make();
    return auth.signInWithPopup(provider).catch(function (err) {
      var usarRedireccion = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'];
      if (err && usarRedireccion.indexOf(err.code) !== -1) return auth.signInWithRedirect(provider);
      throw err;
    });
  };
  window.authGoogleLogin = function () { return window.authProviderLogin('google'); };

  // Acceso sin contraseña: se envía un enlace al correo y al abrirlo se entra.
  var EMAIL_LINK_KEY = 'libreria_email_link';
  window.authSendEmailLink = function (email) {
    var settings = { url: window.location.origin + '/cuenta.html', handleCodeInApp: true };
    return auth.sendSignInLinkToEmail(email, settings).then(function () {
      try { window.localStorage.setItem(EMAIL_LINK_KEY, email); } catch (e) {}
    });
  };
  // Si la página se ha abierto desde ese enlace, completa el acceso.
  window.authCompleteEmailLink = function () {
    if (!auth.isSignInWithEmailLink(window.location.href)) return null;
    var email = null;
    try { email = window.localStorage.getItem(EMAIL_LINK_KEY); } catch (e) {}
    if (!email) email = window.prompt('Confirma tu correo electrónico para terminar de iniciar sesión:');
    if (!email) return null;
    return auth.signInWithEmailLink(email.trim(), window.location.href).then(function () {
      try { window.localStorage.removeItem(EMAIL_LINK_KEY); } catch (e) {}
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', window.location.pathname);
    });
  };
  window.authLogout = function () {
    return auth.signOut();
  };
  window.authResetPassword = function (email) {
    return auth.sendPasswordResetEmail(email);
  };

  // Al volver de Google tras signInWithRedirect, Firebase ya deja la
  // sesión iniciada por su cuenta (se refleja arriba en onAuthStateChanged);
  // aquí solo capturamos un posible error para poder mostrarlo en pantalla.
  // Como esto ocurre de forma asíncrona, guardamos el error en
  // "window.authGoogleRedirectError" y avisamos por si cuenta.html ya
  // registró "window.onGoogleRedirectError" para pintarlo con su propio
  // mensaje traducido; si no, lo dejamos ahí para que lo compruebe al cargar.
  function avisarErrorDeAcceso(err) {
    window.authGoogleRedirectError = err;
    if (typeof window.onGoogleRedirectError === 'function') window.onGoogleRedirectError(err);
    console.error('Error al iniciar sesión', err);
  }
  auth.getRedirectResult().catch(avisarErrorDeAcceso);
  var enlaceCorreo = window.authCompleteEmailLink();
  if (enlaceCorreo) enlaceCorreo.catch(avisarErrorDeAcceso);

  // ---- Panel de cuenta: perfil, contraseña y baja de cuenta ----------------
  window.authUpdateProfileName = function (nombre) {
    var user = auth.currentUser;
    if (!user) return Promise.reject({ code: 'auth/no-user' });
    return user.updateProfile({ displayName: nombre });
  };

  window.authChangePassword = function (currentPassword, newPassword) {
    var user = auth.currentUser;
    if (!user) return Promise.reject({ code: 'auth/no-user' });
    var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    return user.reauthenticateWithCredential(credential).then(function () {
      return user.updatePassword(newPassword);
    });
  };

  window.authDeleteAccount = function (currentPassword) {
    var user = auth.currentUser;
    if (!user) return Promise.reject({ code: 'auth/no-user' });
    var social = user.providerData.filter(function (p) { return providerIds[p.providerId]; })[0];
    var tienePassword = user.providerData.some(function (p) { return p.providerId === 'password'; });
    var reauth;
    if (tienePassword && currentPassword) {
      reauth = user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, currentPassword));
    } else if (social) {
      reauth = user.reauthenticateWithPopup(providerFactories[providerIds[social.providerId]]());
    } else {
      // Acceso por enlace de correo (sin contraseña): se intenta borrar
      // directamente; si el acceso no es reciente, Firebase pedirá volver a entrar.
      reauth = Promise.resolve();
    }
    return reauth.then(function () { return user.delete(); });
  };

  window.authHasPassword = function (user) {
    return !!(user && user.providerData && user.providerData.some(function (p) { return p.providerId === 'password'; }));
  };
  // ---- Verificación del correo con código (ver functions/index.js) ----------
  // ¿Esta cuenta tiene que verificar su correo? Solo las de correo y contraseña
  // creadas desde VERIFICACION_OBLIGATORIA_DESDE. Google, Facebook, Apple,
  // Microsoft y el enlace por correo ya llegan verificados.
  window.authNeedsEmailVerification = function (user) {
    if (!user || user.emailVerified || !user.email) return false;
    if (!window.authHasPassword(user)) return false;
    var creada = user.metadata && user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : 0;
    var desde = typeof VERIFICACION_OBLIGATORIA_DESDE !== 'undefined' ? VERIFICACION_OBLIGATORIA_DESDE : 0;
    return !creada || creada >= desde;
  };
  window.authSendVerificationCode = function () {
    return firebase.functions().httpsCallable('enviarCodigoVerificacion')().then(function (r) { return r.data; });
  };
  window.authVerifyCode = function (codigo) {
    return firebase.functions().httpsCallable('verificarCodigoCorreo')({ codigo: codigo }).then(function () {
      // Refresca los datos de la cuenta y el token para que "correo verificado"
      // llegue ya a la web y al servidor.
      return auth.currentUser.reload();
    }).then(function () {
      return auth.currentUser.getIdToken(true);
    });
  };

  window.authIsGoogleAccount = function (user) {
    return !!(user && user.providerData && user.providerData.some(function (p) { return p.providerId === 'google.com'; }));
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
    renderAccountMenu(user);
    if (typeof window.onAuthReady === 'function') window.onAuthReady(user);
  });

  // ==========================================================================
  // Menú de cuenta en la cabecera (todas las páginas)
  // --------------------------------------------------------------------------
  // Antes solo se podía cerrar sesión desde el panel lateral de cuenta.html,
  // así que mucha gente no encontraba la opción. Ahora, con la sesión iniciada,
  // el icono de persona de la cabecera abre un menú con el perfil, los pedidos,
  // la lista de deseos y el botón de "Cerrar sesión", en cualquier página.
  // Se inyecta desde JS para no tener que tocar el HTML de cada página.
  // ==========================================================================
  var accountMenuBuilt = false;
  var pendingUser = null;

  function initials(user) {
    var base = (user.displayName || user.email || '?').trim();
    return base.charAt(0).toUpperCase();
  }

  function buildAccountMenu(link) {
    var wrap = document.createElement('div');
    wrap.className = 'account-menu';
    link.parentNode.insertBefore(wrap, link);
    wrap.appendChild(link);

    var panel = document.createElement('div');
    panel.className = 'account-menu-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="account-menu-head">' +
        '<span class="account-menu-avatar" data-menu-avatar>?</span>' +
        '<div class="account-menu-id">' +
          '<p class="account-menu-name" data-menu-name></p>' +
          '<p class="account-menu-email" data-menu-email></p>' +
        '</div>' +
      '</div>' +
      '<nav class="account-menu-links">' +
        '<a href="cuenta.html#resumen">Mi perfil</a>' +
        '<a href="cuenta.html#pedidos">Mis pedidos</a>' +
        '<a href="cuenta.html#deseos">Lista de deseos</a>' +
        '<a href="cuenta.html#datos">Datos personales</a>' +
        '<a href="cuenta.html#seguridad">Seguridad</a>' +
      '</nav>' +
      '<button type="button" class="account-menu-logout" data-menu-logout>Cerrar sesión</button>';
    wrap.appendChild(panel);

    function closeMenu() {
      panel.hidden = true;
      link.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      panel.hidden = false;
      link.setAttribute('aria-expanded', 'true');
    }

    link.addEventListener('click', function (e) {
      // Sin sesión, el icono sigue llevando a cuenta.html como siempre.
      if (!link.classList.contains('is-logged-in')) return;
      e.preventDefault();
      if (panel.hidden) openMenu(); else closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    panel.querySelector('[data-menu-logout]').addEventListener('click', function () {
      closeMenu();
      window.authLogout().then(function () {
        window.location.href = 'index.html';
      });
    });

    accountMenuBuilt = true;
    return panel;
  }

  function renderAccountMenu(user) {
    var link = document.querySelector('[data-account-link]');
    if (!link) { pendingUser = user; return; }

    var wrap = link.closest('.account-menu');
    if (!wrap) {
      if (!user) return; // sin sesión no hace falta construir nada
      buildAccountMenu(link);
      wrap = link.closest('.account-menu');
    }
    var panel = wrap.querySelector('.account-menu-panel');

    if (!user) {
      panel.hidden = true;
      link.removeAttribute('aria-expanded');
      link.removeAttribute('aria-haspopup');
      return;
    }

    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');
    panel.querySelector('[data-menu-avatar]').textContent = initials(user);
    panel.querySelector('[data-menu-name]').textContent = user.displayName || 'Mi cuenta';
    panel.querySelector('[data-menu-email]').textContent = user.email || '';
  }

  // Si el estado de sesión llegó antes de que el DOM estuviera listo,
  // reintentamos al cargar la página.
  document.addEventListener('DOMContentLoaded', function () {
    if (!accountMenuBuilt && pendingUser !== null) renderAccountMenu(pendingUser);
    else if (!accountMenuBuilt && auth.currentUser) renderAccountMenu(auth.currentUser);
  });

  // ---- Lógica para alternar las pestañas de Iniciar Sesión / Crear Cuenta ----
  document.addEventListener('DOMContentLoaded', function () {
    var authTabs = document.querySelectorAll('.auth-tab');
    // Solo los formularios de "Iniciar sesión" / "Crear cuenta" (llevan
    // data-panel). OJO: no ampliar este selector a ".auth-form" a secas —
    // así se englobaban también el formulario del código de verificación y
    // el del enlace por correo, que no tienen "data-panel". Como más abajo
    // se les fija "display:none" en el propio estilo del elemento, y esos
    // otros dos formularios se muestran en otro momento solo quitándoles el
    // atributo "hidden" (en account.js), ese "display:none" nunca se
    // borraba y se quedaban invisibles para siempre aunque ya no estuvieran
    // "hidden": no se podía escribir en ellos ni enviarlos.
    var authForms = document.querySelectorAll('.auth-card .auth-form[data-panel]');
    var authTabsBar = document.querySelector('.auth-tabs');

    function mostrarPanel(targetPanel) {
      authTabs.forEach(function (t) {
        t.classList.toggle('is-active', t.getAttribute('data-auth-tab') === targetPanel);
      });
      authForms.forEach(function (form) {
        var oculto = form.getAttribute('data-panel') !== targetPanel;
        form.hidden = oculto;
        // Refuerzo: si la hoja de estilos llega cacheada/antigua, el atributo
        // "hidden" puede perder frente a ".auth-form { display:flex }" y los
        // dos formularios se ven solapados. Con esto nunca pasa.
        form.style.display = oculto ? 'none' : '';
      });
      // Al entrar en "Crear cuenta" quitamos las pestañas del todo: solo queda
      // el formulario de registro con un enlace pequeño para volver a iniciar
      // sesión, en vez de dejar la pestaña "Iniciar sesión" siempre a la vista.
      if (authTabsBar) authTabsBar.hidden = targetPanel === 'register';
    }

    if (authTabs.length > 0) {
      // Estado inicial explícito: solo "Iniciar sesión" visible.
      mostrarPanel('login');
      authTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          mostrarPanel(tab.getAttribute('data-auth-tab'));
        });
      });
    }

    document.querySelectorAll('[data-auth-switch]').forEach(function (link) {
      link.addEventListener('click', function () {
        mostrarPanel(link.getAttribute('data-auth-switch'));
      });
    });
  });
})();