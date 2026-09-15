// ==========================================================================
// Encargos personalizados en el panel de administración (admin.html)
// --------------------------------------------------------------------------
// Muestra las solicitudes de la colección "encargos": quién la ha pedido,
// cómo quiere el libro, la imagen que ha subido para la portada, y permite
// cambiar el estado y anotar el precio final que le has enviado por correo.
// Va en un archivo aparte para no tocar js/admin.js.
// ==========================================================================
(function () {
  var wrap = document.getElementById('adminEncargos');
  if (!wrap) return;

  var lista = document.getElementById('adminEncargosList');
  var vacio = document.getElementById('adminEncargosEmpty');

  var ESTADOS = ['en-revision', 'presupuestado', 'aceptado', 'en-produccion', 'enviado', 'cancelado'];
  var ETIQUETAS = {
    'en-revision': 'En revisión',
    presupuestado: 'Presupuesto enviado',
    aceptado: 'Aceptado',
    'en-produccion': 'En producción',
    enviado: 'Enviado',
    cancelado: 'Cancelado'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtEUR(n) { return (n || 0).toFixed(2).replace('.', ',') + '\u00A0€'; }

  function encargoHTML(e) {
    var fecha = e.createdAt && e.createdAt.toDate
      ? e.createdAt.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Procesando…';

    var opciones = ESTADOS.map(function (v) {
      return '<option value="' + v + '"' + (e.estado === v ? ' selected' : '') + '>' + ETIQUETAS[v] + '</option>';
    }).join('');

    return '<details class="admin-order-card" data-id="' + esc(e._id) + '">' +
      '<summary>' +
        '<span class="admin-order-cliente">' + esc(e.libroTitulo || 'Encargo') +
          '<small>' + esc(e.clienteNombre || '') + ' · ' + esc(e.clienteEmail || '') + '</small></span>' +
        '<span class="admin-order-fecha">' + fecha + '</span>' +
        '<span class="order-status">' + esc(ETIQUETAS[e.estado] || 'En revisión') + '</span>' +
      '</summary>' +
      '<div class="admin-order-body">' +
        '<div class="admin-order-col">' +
          '<h4>Cómo lo quiere</h4>' +
          '<p class="admin-order-line">' + esc(e.cantidad || 1) + ' ejemplar(es)</p>' +
          '<p class="admin-order-line">' + esc(e.encuadernacion || '') + ' · ' + esc(e.tamano || '') + '</p>' +
          '<p class="admin-order-line">Cubierta ' + esc(e.acabado || '') + ' · Papel ' + esc(e.papel || '') + '</p>' +
          (e.textoPortada ? '<p class="admin-order-line">Texto en portada: «' + esc(e.textoPortada) + '»</p>' : '') +
          (e.notas ? '<p class="admin-order-line">Notas: ' + esc(e.notas) + '</p>' : '') +
          (e.clienteTelefono ? '<p class="admin-order-line">Tel: ' + esc(e.clienteTelefono) + '</p>' : '') +
        '</div>' +
        '<div class="admin-order-col">' +
          '<h4>Imagen para la portada</h4>' +
          (e.portadaUrl
            ? '<a href="' + esc(e.portadaUrl) + '" target="_blank" rel="noopener noreferrer">' +
                '<img src="' + esc(e.portadaUrl) + '" alt="Imagen enviada por el cliente" class="admin-encargo-img">' +
              '</a>' +
              '<p class="admin-order-line"><a href="' + esc(e.portadaUrl) + '" target="_blank" rel="noopener noreferrer">Abrir / descargar</a></p>'
            : '<p class="admin-order-line">Sin imagen.</p>') +
        '</div>' +
        '<div class="admin-order-col admin-order-actions">' +
          '<label>Estado' +
            '<select data-encargo-estado>' + opciones + '</select>' +
          '</label>' +
          '<label>Precio final (€)' +
            '<input type="number" step="0.01" min="0" data-encargo-precio value="' +
              (typeof e.precioFinal === 'number' ? e.precioFinal : '') + '">' +
          '</label>' +
          '<button type="button" class="btn btn--primary btn--sm" data-encargo-guardar>Guardar</button>' +
          '<p class="admin-order-line" data-encargo-msg hidden></p>' +
          (typeof e.precioFinal === 'number' ? '<p class="admin-order-line">Guardado: ' + fmtEUR(e.precioFinal) + '</p>' : '') +
          '<p class="admin-order-line"><a href="mailto:' + esc(e.clienteEmail || '') +
            '?subject=' + encodeURIComponent('Tu pedido personalizado — Librería tu mayor tesoro') +
            '">Escribir al cliente</a></p>' +
        '</div>' +
      '</div>' +
    '</details>';
  }

  function cargar() {
    if (!window.fbDb) return;
    window.fbDb.collection('encargos').get().then(function (snap) {
      var docs = [];
      snap.forEach(function (d) {
        var data = d.data();
        data._id = d.id;
        docs.push(data);
      });
      docs.sort(function (a, b) {
        var fa = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        var fb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return fb - fa;
      });
      vacio.hidden = docs.length > 0;
      lista.innerHTML = docs.map(encargoHTML).join('');
    }).catch(function (err) {
      console.error('No se han podido cargar los encargos', err);
    });
  }

  lista.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-encargo-guardar]');
    if (!btn) return;
    var card = btn.closest('[data-id]');
    var id = card.getAttribute('data-id');
    var estado = card.querySelector('[data-encargo-estado]').value;
    var precioRaw = card.querySelector('[data-encargo-precio]').value;
    var msg = card.querySelector('[data-encargo-msg]');

    var cambios = { estado: estado };
    if (precioRaw !== '') cambios.precioFinal = parseFloat(precioRaw);

    btn.disabled = true;
    window.fbDb.collection('encargos').doc(id).update(cambios).then(function () {
      msg.textContent = 'Guardado.';
      msg.hidden = false;
    }).catch(function (err) {
      console.error('No se ha podido guardar el encargo', err);
      msg.textContent = 'No se ha podido guardar.';
      msg.hidden = false;
    }).finally(function () {
      btn.disabled = false;
    });
  });

  // Se carga cuando admin.js ya ha comprobado que eres administrador:
  // esperamos a que el panel deje de estar oculto.
  var dashboard = document.getElementById('adminDashboard');
  var observer = new MutationObserver(function () {
    if (!dashboard.hidden) {
      observer.disconnect();
      cargar();
    }
  });
  if (dashboard) {
    if (!dashboard.hidden) cargar();
    else observer.observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
