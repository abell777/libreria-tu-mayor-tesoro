// ==========================================================================
// Panel de administración (admin.html): solo visible para los UID definidos
// en ADMIN_UIDS (js/config.js). La seguridad real la dan las reglas de
// Firestore — esta comprobación en el cliente solo controla qué se muestra.
// ==========================================================================
(function () {
  var guard = document.getElementById('adminGuard');
  var dashboard = document.getElementById('adminDashboard');
  if (!guard || !dashboard) return;

  var pedidosCache = [];
  var filtroEstado = 'todos';
  var textoBusqueda = '';

  function fmtEUR(n) {
    return (n || 0).toFixed(2).replace('.', ',') + '\u00A0€';
  }

  function capitaliza(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function normaliza(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ---- Renderizado ----------------------------------------------------------
  function pedidoAdminHTML(pedido) {
    var fecha = pedido.createdAt && pedido.createdAt.toDate
      ? pedido.createdAt.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Procesando…';
    var envio = pedido.envio || {};
    var items = (pedido.items || []).map(function (it) {
      return '<li>' + it.cantidad + ' × ' + escapeHTML(it.titulo) + (it.formato ? ' (' + escapeHTML(it.formato) + ')' : '') + ' — ' + fmtEUR(it.precio * it.cantidad) + '</li>';
    }).join('');

    return (
      '<details class="admin-order-card" data-id="' + escapeHTML(pedido._id) + '">' +
        '<summary>' +
          '<span class="admin-order-numero">#' + escapeHTML(pedido.numero) + '</span>' +
          '<span class="admin-order-cliente">' + escapeHTML(pedido.clienteNombre || '') + '<small>' + escapeHTML(pedido.clienteEmail || '') + '</small></span>' +
          '<span class="admin-order-fecha">' + fecha + '</span>' +
          '<span class="admin-order-total">' + fmtEUR(pedido.total) + '</span>' +
          '<span class="order-status order-status--' + escapeHTML(pedido.estado) + '">' + capitaliza(pedido.estado) + '</span>' +
        '</summary>' +
        '<div class="admin-order-body">' +
          '<div class="admin-order-col">' +
            '<h4>Artículos</h4>' +
            '<ul class="order-items">' + items + '</ul>' +
            '<p class="admin-order-line">Subtotal: ' + fmtEUR(pedido.subtotal) + '</p>' +
            '<p class="admin-order-line">Envío: ' + (pedido.gastosEnvio ? fmtEUR(pedido.gastosEnvio) : 'Gratis') + '</p>' +
            '<p class="admin-order-line admin-order-line--total">Total: ' + fmtEUR(pedido.total) + '</p>' +
          '</div>' +
          '<div class="admin-order-col">' +
            '<h4>Dirección de envío</h4>' +
            '<p>' + escapeHTML(envio.nombre || '') + '<br>' + escapeHTML(envio.direccion || '') + '<br>' + escapeHTML(envio.cp || '') + ' ' + escapeHTML(envio.ciudad || '') + '<br>' + escapeHTML(envio.telefono || '') + '</p>' +
          '</div>' +
          '<div class="admin-order-col admin-order-actions">' +
            '<label>Estado del pedido' +
              '<select data-estado-select data-id="' + pedido._id + '">' +
                '<option value="pendiente"' + (pedido.estado === 'pendiente' ? ' selected' : '') + '>Pendiente</option>' +
                '<option value="enviado"' + (pedido.estado === 'enviado' ? ' selected' : '') + '>Enviado</option>' +
                '<option value="entregado"' + (pedido.estado === 'entregado' ? ' selected' : '') + '>Entregado</option>' +
              '</select>' +
            '</label>' +
            '<span class="admin-save-flash" data-save-flash hidden>Guardado ✓</span>' +
          '</div>' +
        '</div>' +
      '</details>'
    );
  }

  function pedidoCoincide(pedido) {
    if (filtroEstado !== 'todos' && pedido.estado !== filtroEstado) return false;
    if (!textoBusqueda) return true;
    var campo = normaliza(pedido.numero + ' ' + pedido.clienteNombre + ' ' + pedido.clienteEmail);
    return campo.indexOf(normaliza(textoBusqueda)) !== -1;
  }

  function renderLista() {
    var list = document.getElementById('adminOrdersList');
    var empty = document.getElementById('adminOrdersEmpty');
    var visibles = pedidosCache.filter(pedidoCoincide);
    list.innerHTML = visibles.map(pedidoAdminHTML).join('');
    empty.hidden = visibles.length > 0;
  }

  function actualizarEstadisticas() {
    var total = pedidosCache.length;
    var ingresos = pedidosCache.reduce(function (acc, p) { return acc + (p.total || 0); }, 0);
    var pendientes = pedidosCache.filter(function (p) { return p.estado === 'pendiente'; }).length;
    document.getElementById('adminStatTotal').textContent = String(total);
    document.getElementById('adminStatIngresos').textContent = fmtEUR(ingresos);
    document.getElementById('adminStatPendientes').textContent = String(pendientes);
  }

  // ---- Carga de pedidos -------------------------------------------------------
  function cargarPedidosAdmin() {
    document.getElementById('adminOrdersList').innerHTML = '<p class="orders-empty">Cargando pedidos…</p>';
    window.fbDb.collection('pedidos').orderBy('createdAt', 'desc').get()
      .then(function (snapshot) {
        pedidosCache = [];
        snapshot.forEach(function (doc) {
          var data = doc.data();
          data._id = doc.id;
          pedidosCache.push(data);
        });
        actualizarEstadisticas();
        renderLista();
      })
      .catch(function (err) {
        console.error('Error al cargar los pedidos', err);
        document.getElementById('adminOrdersList').innerHTML = '<p class="orders-empty">No se han podido cargar los pedidos. Revisa las reglas de Firestore.</p>';
      });
  }

  // ---- Interacción: filtros, búsqueda y cambio de estado ----------------------
  document.getElementById('adminFilterTabs').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-status-filter]');
    if (!btn) return;
    document.querySelectorAll('.admin-filter-btn').forEach(function (b) { b.classList.remove('is-active'); });
    btn.classList.add('is-active');
    filtroEstado = btn.getAttribute('data-status-filter');
    renderLista();
  });

  document.getElementById('adminSearch').addEventListener('input', function (e) {
    textoBusqueda = e.target.value;
    renderLista();
  });

  document.getElementById('adminOrdersList').addEventListener('change', function (e) {
    var select = e.target.closest('[data-estado-select]');
    if (!select) return;
    var id = select.getAttribute('data-id');
    var nuevoEstado = select.value;
    var card = select.closest('.admin-order-card');
    var flash = card.querySelector('[data-save-flash]');
    var badge = card.querySelector('.order-status');

    window.fbDb.collection('pedidos').doc(id).update({ estado: nuevoEstado })
      .then(function () {
        var pedido = pedidosCache.filter(function (p) { return p._id === id; })[0];
        if (pedido) pedido.estado = nuevoEstado;
        badge.className = 'order-status order-status--' + nuevoEstado;
        badge.textContent = capitaliza(nuevoEstado);
        actualizarEstadisticas();
        if (flash) {
          flash.hidden = false;
          setTimeout(function () { flash.hidden = true; }, 1800);
        }
      })
      .catch(function (err) {
        console.error('Error al actualizar el pedido', err);
        alert('No se ha podido actualizar el estado. Revisa las reglas de Firestore.');
      });
  });

  // ---- Comprobación de acceso ---------------------------------------------------
  window.fbAuth.onAuthStateChanged(function (user) {
    var esAdmin = user && typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(user.uid) !== -1;
    if (esAdmin) {
      guard.hidden = true;
      dashboard.hidden = false;
      cargarPedidosAdmin();
    } else {
      guard.hidden = false;
      dashboard.hidden = true;
      guard.innerHTML = user
        ? '<p class="admin-denied">Esta cuenta no tiene permisos de administración. <a href="index.html">Volver a la tienda</a>.</p>'
        : '<p class="admin-denied">Inicia sesión con una cuenta de administrador para continuar. <a href="cuenta.html">Iniciar sesión</a>.</p>';
    }
  });
})();
