// ==========================================================================
// Lógica de la página "Mi cuenta": pestañas login/registro, Google,
// cierre de sesión y listado de pedidos del usuario.
// ==========================================================================
(function () {
  var tabs = document.querySelectorAll('[data-auth-tab]');
  var panels = document.querySelectorAll('.auth-form');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      var target = tab.getAttribute('data-auth-tab');
      panels.forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== target;
      });
    });
  });

  function traducirErrorFirebase(err) {
    var code = err && err.code;
    var mapa = {
      'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Prueba a iniciar sesión.',
      'auth/invalid-email': 'El correo electrónico no es válido.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/user-not-found': 'No existe ninguna cuenta con ese correo.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.'
    };
    return mapa[code] || 'Ha ocurrido un error. Inténtalo de nuevo.';
  }

  function mostrarError(el, err) {
    if (!el) return;
    el.textContent = traducirErrorFirebase(err);
    el.hidden = false;
  }

  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(loginForm);
      var errorEl = document.getElementById('loginError');
      errorEl.hidden = true;
      window.authLogin(fd.get('email'), fd.get('password')).catch(function (err) {
        mostrarError(errorEl, err);
      });
    });
  }

  var registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(registerForm);
      var errorEl = document.getElementById('registerError');
      errorEl.hidden = true;
      window.authRegister(fd.get('nombre'), fd.get('email'), fd.get('password')).catch(function (err) {
        mostrarError(errorEl, err);
      });
    });
  }

  var googleBtn = document.getElementById('googleLoginBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      window.authGoogleLogin().catch(function (err) {
        mostrarError(document.getElementById('loginError'), err);
      });
    });
  }

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      window.authLogout();
    });
  }

  window.onAuthReady = function (user) {
    var loggedOut = document.getElementById('authLoggedOut');
    var loggedIn = document.getElementById('authLoggedIn');
    if (!loggedOut || !loggedIn) return;

    if (user) {
      loggedOut.hidden = true;
      loggedIn.hidden = false;
      document.getElementById('accountName').textContent = user.displayName || 'cliente';
      document.getElementById('accountEmail').textContent = user.email || '';
      cargarPedidos(user.uid);
    } else {
      loggedOut.hidden = false;
      loggedIn.hidden = true;
    }
  };

  function capitaliza(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function cargarPedidos(uid) {
    var list = document.getElementById('ordersList');
    var empty = document.getElementById('ordersEmpty');
    if (!list || !window.fbDb) return;

    window.fbDb.collection('pedidos')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        list.querySelectorAll('.order-card').forEach(function (n) { n.remove(); });

        if (snapshot.empty) {
          if (empty) empty.hidden = false;
          return;
        }
        if (empty) empty.hidden = true;

        snapshot.forEach(function (doc) {
          var pedido = doc.data();
          var fecha = pedido.createdAt && pedido.createdAt.toDate
            ? pedido.createdAt.toDate().toLocaleDateString('es-ES')
            : '';
          var items = (pedido.items || []).map(function (it) {
            return '<li>' + it.cantidad + ' × ' + it.titulo + '</li>';
          }).join('');
          var total = (pedido.total || 0).toFixed(2).replace('.', ',');

          var card = document.createElement('article');
          card.className = 'order-card';
          card.innerHTML =
            '<div class="order-card-head">' +
              '<span class="order-number">Pedido #' + (pedido.numero || doc.id.slice(0, 6).toUpperCase()) + '</span>' +
              '<span class="order-status order-status--' + (pedido.estado || 'pendiente') + '">' + capitaliza(pedido.estado || 'pendiente') + '</span>' +
            '</div>' +
            '<p class="order-date">' + fecha + '</p>' +
            '<ul class="order-items">' + items + '</ul>' +
            '<p class="order-total">Total: ' + total + '&nbsp;€</p>';
          list.appendChild(card);
        });
      })
      .catch(function (err) {
        console.error('Error al cargar los pedidos', err);
      });
  }
})();
