// ==========================================================================
// Panel de cuenta: pestañas login/registro, Google, y el panel completo
// tras iniciar sesión (resumen, pedidos, datos, direcciones, seguridad).
// ==========================================================================
(function () {
  // ---- Pestañas login / registro (sin sesión) -----------------------------
  var tabs = document.querySelectorAll('[data-auth-tab]');
  var panels = document.querySelectorAll('.auth-form[data-panel]');

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
      'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
      'auth/requires-recent-login': 'Por seguridad, cierra sesión y vuelve a entrar antes de repetir esta acción.',
      'auth/no-user': 'No hay ninguna sesión activa.'
    };
    return mapa[code] || 'Ha ocurrido un error. Inténtalo de nuevo.';
  }

  function mostrarError(el, err) {
    if (!el) return;
    el.textContent = traducirErrorFirebase(err);
    el.hidden = false;
  }

  function mostrarExito(el, ms) {
    if (!el) return;
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, ms || 2500);
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

  // ---- Navegación por pestañas del panel de cuenta -------------------------
  var navBtns = document.querySelectorAll('[data-account-panel]');
  var accountPanels = document.querySelectorAll('.account-panel[data-panel]');
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      navBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var target = btn.getAttribute('data-account-panel');
      accountPanels.forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== target;
        if (p.getAttribute('data-panel') === target) p.classList.add('is-active');
        else p.classList.remove('is-active');
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  function capitaliza(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function pedidoCardHTML(pedido, docId) {
    var fecha = pedido.createdAt && pedido.createdAt.toDate
      ? pedido.createdAt.toDate().toLocaleDateString('es-ES')
      : '';
    var items = (pedido.items || []).map(function (it) {
      return '<li>' + it.cantidad + ' × ' + it.titulo + '</li>';
    }).join('');
    var total = (pedido.total || 0).toFixed(2).replace('.', ',');
    return (
      '<article class="order-card">' +
        '<div class="order-card-head">' +
          '<span class="order-number">Pedido #' + (pedido.numero || docId.slice(0, 6).toUpperCase()) + '</span>' +
          '<span class="order-status order-status--' + (pedido.estado || 'pendiente') + '">' + capitaliza(pedido.estado || 'pendiente') + '</span>' +
        '</div>' +
        '<p class="order-date">' + fecha + '</p>' +
        '<ul class="order-items">' + items + '</ul>' +
        '<p class="order-total">Total: ' + total + '&nbsp;€</p>' +
      '</article>'
    );
  }

  // ---- Carga de pedidos: alimenta "Mis pedidos", "Resumen" y las estadísticas ----
  function cargarPedidos(uid) {
    var list = document.getElementById('ordersList');
    var empty = document.getElementById('ordersEmpty');
    var lastPreview = document.getElementById('lastOrderPreview');
    var lastEmpty = document.getElementById('lastOrderEmpty');
    var statPedidos = document.getElementById('statPedidos');
    var statTotal = document.getElementById('statTotal');
    if (!list || !window.fbDb) return;

    window.fbDb.collection('pedidos')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function (snapshot) {
        list.querySelectorAll('.order-card').forEach(function (n) { n.remove(); });
        if (lastPreview) lastPreview.innerHTML = '';

        if (snapshot.empty) {
          if (empty) empty.hidden = false;
          if (lastEmpty) lastEmpty.hidden = false;
          if (statPedidos) statPedidos.textContent = '0';
          if (statTotal) statTotal.textContent = '0,00\u00A0€';
          return;
        }
        if (empty) empty.hidden = true;
        if (lastEmpty) lastEmpty.hidden = true;

        var totalGastado = 0;
        var primero = true;
        snapshot.forEach(function (doc) {
          var pedido = doc.data();
          totalGastado += pedido.total || 0;
          list.insertAdjacentHTML('beforeend', pedidoCardHTML(pedido, doc.id));
          if (primero && lastPreview) {
            lastPreview.insertAdjacentHTML('beforeend', pedidoCardHTML(pedido, doc.id));
            primero = false;
          }
        });

        if (statPedidos) statPedidos.textContent = String(snapshot.size);
        if (statTotal) statTotal.textContent = totalGastado.toFixed(2).replace('.', ',') + '\u00A0€';
      })
      .catch(function (err) {
        console.error('Error al cargar los pedidos', err);
      });
  }

  // ---- Datos personales -----------------------------------------------------
  function cargarPerfil(user) {
    var nombreInput = document.getElementById('datosNombre');
    var emailInput = document.getElementById('datosEmail');
    if (emailInput) emailInput.value = user.email || '';
    if (nombreInput) nombreInput.value = user.displayName || '';

    if (!window.fbDb) return;
    window.fbDb.collection('usuarios').doc(user.uid).get().then(function (doc) {
      var data = doc.exists ? doc.data() : {};
      var telefonoInput = document.getElementById('datosTelefono');
      if (telefonoInput) telefonoInput.value = data.telefono || '';
      cargarDirecciones(data.direcciones || []);
    }).catch(function (err) {
      console.error('Error al cargar el perfil', err);
      cargarDirecciones([]);
    });
  }

  var datosForm = document.getElementById('datosForm');
  if (datosForm) {
    datosForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      if (!user) return;
      var fd = new FormData(datosForm);
      var nombre = fd.get('nombre');
      var telefono = fd.get('telefono');
      var errorEl = document.getElementById('datosError');
      var successEl = document.getElementById('datosSuccess');
      errorEl.hidden = true;

      Promise.all([
        window.authUpdateProfileName(nombre),
        window.fbDb ? window.fbDb.collection('usuarios').doc(user.uid).set({ nombre: nombre, telefono: telefono }, { merge: true }) : Promise.resolve()
      ]).then(function () {
        document.getElementById('accountName').textContent = nombre;
        document.getElementById('accountNameHead').textContent = nombre;
        setAvatarInitial(nombre);
        mostrarExito(successEl);
      }).catch(function (err) {
        mostrarError(errorEl, err);
      });
    });
  }

  // ---- Direcciones ------------------------------------------------------------
  var direccionesActuales = [];

  function guardarDirecciones(uid, direcciones) {
    return window.fbDb.collection('usuarios').doc(uid).set({ direcciones: direcciones }, { merge: true });
  }

  function addressCardHTML(dir) {
    return (
      '<article class="address-card' + (dir.predeterminada ? ' is-default' : '') + '" data-id="' + dir.id + '">' +
        (dir.predeterminada ? '<span class="address-badge">Predeterminada</span>' : '') +
        '<p class="address-label">' + dir.etiqueta + '</p>' +
        '<p class="address-details">' + dir.nombre + '<br>' + dir.direccion + '<br>' + dir.cp + ' ' + dir.ciudad + '<br>' + dir.telefono + '</p>' +
        '<div class="address-actions">' +
          '<button type="button" data-edit-address>Editar</button>' +
          (dir.predeterminada ? '' : '<button type="button" data-set-default>Predeterminada</button>') +
          '<button type="button" class="address-delete" data-delete-address>Eliminar</button>' +
        '</div>' +
      '</article>'
    );
  }

  function cargarDirecciones(direcciones) {
    direccionesActuales = direcciones || [];
    var list = document.getElementById('addressList');
    var empty = document.getElementById('addressEmpty');
    if (!list) return;
    list.innerHTML = direccionesActuales.map(addressCardHTML).join('');
    if (empty) empty.hidden = direccionesActuales.length > 0;

    list.querySelectorAll('[data-edit-address]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.address-card').dataset.id;
        abrirFormularioDireccion(direccionesActuales.filter(function (d) { return d.id === id; })[0]);
      });
    });
    list.querySelectorAll('[data-set-default]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.address-card').dataset.id;
        var user = window.fbAuth ? window.fbAuth.currentUser : null;
        if (!user) return;
        direccionesActuales.forEach(function (d) { d.predeterminada = d.id === id; });
        guardarDirecciones(user.uid, direccionesActuales).then(function () { cargarDirecciones(direccionesActuales); });
      });
    });
    list.querySelectorAll('[data-delete-address]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.address-card').dataset.id;
        var user = window.fbAuth ? window.fbAuth.currentUser : null;
        if (!user || !confirm('¿Eliminar esta dirección guardada?')) return;
        direccionesActuales = direccionesActuales.filter(function (d) { return d.id !== id; });
        guardarDirecciones(user.uid, direccionesActuales).then(function () { cargarDirecciones(direccionesActuales); });
      });
    });
  }

  function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  var addressForm = document.getElementById('addressForm');
  var addAddressBtn = document.getElementById('addAddressBtn');
  var cancelAddressBtn = document.getElementById('cancelAddressBtn');

  function abrirFormularioDireccion(direccion) {
    if (!addressForm) return;
    addressForm.reset();
    addressForm.hidden = false;
    addressForm.elements.addressId.value = direccion ? direccion.id : '';
    if (direccion) {
      addressForm.elements.etiqueta.value = direccion.etiqueta || '';
      addressForm.elements.nombre.value = direccion.nombre || '';
      addressForm.elements.direccion.value = direccion.direccion || '';
      addressForm.elements.ciudad.value = direccion.ciudad || '';
      addressForm.elements.cp.value = direccion.cp || '';
      addressForm.elements.telefono.value = direccion.telefono || '';
      addressForm.elements.predeterminada.checked = !!direccion.predeterminada;
    }
    addressForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', function () { abrirFormularioDireccion(null); });
  }
  if (cancelAddressBtn) {
    cancelAddressBtn.addEventListener('click', function () {
      addressForm.hidden = true;
      addressForm.reset();
    });
  }
  if (addressForm) {
    addressForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      if (!user || !window.fbDb) return;
      var fd = new FormData(addressForm);
      var id = fd.get('addressId') || generarId();
      var esPredeterminada = fd.get('predeterminada') === 'on';
      var nueva = {
        id: id,
        etiqueta: fd.get('etiqueta'),
        nombre: fd.get('nombre'),
        direccion: fd.get('direccion'),
        ciudad: fd.get('ciudad'),
        cp: fd.get('cp'),
        telefono: fd.get('telefono'),
        predeterminada: esPredeterminada
      };

      var siguientes = direccionesActuales.filter(function (d) { return d.id !== id; });
      if (esPredeterminada) siguientes.forEach(function (d) { d.predeterminada = false; });
      if (siguientes.length === 0) nueva.predeterminada = true;
      siguientes.push(nueva);

      guardarDirecciones(user.uid, siguientes).then(function () {
        cargarDirecciones(siguientes);
        addressForm.hidden = true;
        addressForm.reset();
      }).catch(function (err) {
        mostrarError(document.getElementById('addressError'), err);
      });
    });
  }

  // ---- Seguridad: cambiar contraseña y eliminar cuenta ----------------------
  var passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(passwordForm);
      var errorEl = document.getElementById('passwordError');
      var successEl = document.getElementById('passwordSuccess');
      errorEl.hidden = true;
      window.authChangePassword(fd.get('actual'), fd.get('nueva')).then(function () {
        passwordForm.reset();
        mostrarExito(successEl);
      }).catch(function (err) {
        mostrarError(errorEl, err);
      });
    });
  }

  var deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', function () {
      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      if (!user) return;
      if (!confirm('Esta acción es permanente. ¿Seguro que quieres eliminar tu cuenta?')) return;

      var esGoogle = window.authIsGoogleAccount(user);
      var password = esGoogle ? null : prompt('Confirma tu contraseña actual para continuar:');
      if (!esGoogle && !password) return;

      window.authDeleteAccount(password).then(function () {
        window.location.href = 'index.html';
      }).catch(function (err) {
        alert(traducirErrorFirebase(err));
      });
    });
  }

  // ---- Lista de deseos --------------------------------------------------------
  function fmtPrice(n) { return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function wishlistCardHTML(book) {
    return (
      '<article class="book-card" data-product-id="' + book.id + '">' +
        '<a href="producto.html?id=' + book.id + '" class="book-cover book-cover--photo">' +
          '<img src="' + book.cover + '" alt="Portada de «' + book.title + '», de ' + book.author + '" loading="lazy">' +
        '</a>' +
        '<button type="button" class="book-fav is-active" data-fav-toggle data-id="' + book.id + '" aria-pressed="true" aria-label="Quitar de mi lista de deseos">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>' +
        '</button>' +
        '<div class="book-info">' +
          '<span class="book-category">' + book.categoryLabel + '</span>' +
          '<h3 class="book-title"><a href="producto.html?id=' + book.id + '">' + book.title + '</a></h3>' +
          '<p class="book-author">' + book.author + '</p>' +
          '<div class="book-footer">' +
            '<span class="book-price">' + fmtPrice(book.price) + '&nbsp;€<small>' + book.priceNote + '</small></span>' +
            '<button class="btn btn--primary btn--sm" data-add-to-cart data-id="' + book.id + '" data-title="' + book.title + '" data-author="' + book.author + '" data-price="' + book.price + '" data-format="' + book.format + '" data-cover="' + book.cover + '">Añadir</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderWishlist() {
    var grid = document.getElementById('wishlistGrid');
    var empty = document.getElementById('wishlistEmpty');
    if (!grid || !window.Wishlist || !window.BooksCatalog) return;
    var error = window.Wishlist.hasError && window.Wishlist.hasError();
    if (error) {
      grid.innerHTML = '';
      if (empty) {
        empty.hidden = false;
        empty.textContent = 'No se ha podido cargar tu lista de deseos (error: ' + error + '). Revisa que las reglas de Firestore permitan LEER la colección "deseos" al propio usuario.';
      }
      return;
    }
    var books = window.Wishlist.getIds().map(function (id) { return window.BooksCatalog.getById(id); }).filter(Boolean);
    grid.innerHTML = books.map(wishlistCardHTML).join('');
    if (empty) {
      empty.hidden = books.length > 0;
      empty.textContent = 'Todavía no has guardado ningún libro. Pulsa el corazón de un libro para añadirlo aquí.';
    }
  }
  document.addEventListener('wishlist:change', renderWishlist);
  renderWishlist();

  // ---- Estado general del panel ----------------------------------------------
  function setAvatarInitial(nombre) {
    var avatar = document.getElementById('accountAvatar');
    if (avatar) avatar.textContent = (nombre || '?').trim().charAt(0).toUpperCase();
  }

  window.onAuthReady = function (user) {
    var loggedOut = document.getElementById('authLoggedOut');
    var loggedIn = document.getElementById('authLoggedIn');
    var pageContainer = document.querySelector('.account-page');
    if (!loggedOut || !loggedIn) return;

    if (user) {
      loggedOut.hidden = true;
      loggedIn.hidden = false;
      if (pageContainer) pageContainer.classList.add('account-page--dashboard');

      var nombre = user.displayName || 'cliente';
      document.getElementById('accountName').textContent = nombre;
      document.getElementById('accountNameHead').textContent = nombre;
      document.getElementById('accountEmail').textContent = user.email || '';
      setAvatarInitial(nombre);

      var statDesde = document.getElementById('statDesde');
      if (statDesde && user.metadata && user.metadata.creationTime) {
        var fechaAlta = new Date(user.metadata.creationTime);
        statDesde.textContent = fechaAlta.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }

      var esGoogle = window.authIsGoogleAccount(user);
      var passwordBlock = document.getElementById('passwordBlock');
      var googleNotice = document.getElementById('googleAccountNotice');
      if (passwordBlock) passwordBlock.hidden = esGoogle;
      if (googleNotice) googleNotice.hidden = !esGoogle;

      cargarPerfil(user);
      cargarPedidos(user.uid);
    } else {
      loggedOut.hidden = false;
      loggedIn.hidden = true;
      if (pageContainer) pageContainer.classList.remove('account-page--dashboard');
    }
  };
})();
