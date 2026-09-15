// ==========================================================================
// Pedidos personalizados (personalizado.html)
// --------------------------------------------------------------------------
// El cliente elige un título, dice cómo lo quiere, sube la imagen que desea
// en la portada y envía la solicitud. La solicitud se guarda en Firestore
// (colección "encargos") con estado "en-revision" y la imagen en Firebase
// Storage (carpeta "encargos/{uid}/"). Nadie paga nada aquí: el precio se
// cierra a mano por correo, con la portada ya montada.
//
// 👉 PARA MÁS ADELANTE: presupuesto automático. Abajo, en PRESUPUESTO, está
//    todo preparado. Cambia "activo" a true y rellena las tarifas: el precio
//    se calculará solo y se le mostrará al cliente al instante mientras
//    rellena el formulario. Cuando quieras que además pueda comprarlo en el
//    momento, avísame y conectamos ese precio con el carrito/Stripe (está
//    marcado más abajo con "PUNTO DE ENGANCHE").
// ==========================================================================
(function () {
  var form = document.getElementById('customForm');
  if (!form) return; // no estamos en personalizado.html

  // ==========================================================================
  // TARIFAS DEL PRESUPUESTO AUTOMÁTICO  (desactivado por ahora)
  // ==========================================================================
  var PRESUPUESTO = {
    activo: false,            // ← ponlo en true cuando tengas las tarifas
    permitirComprar: false,   // ← true = además podrá pagarlo al momento

    // Precio base: si el título está en el catálogo se usa su precio; si no,
    // se usa este importe de partida.
    baseOtroTitulo: 12.00,

    // Suplementos en euros por ejemplar
    encuadernacion: { 'Tapa blanda': 0.00, 'Tapa dura': 4.50 },
    tamano: {
      'A5 (15 × 21 cm)': 0.00,
      'Bolsillo (11 × 18 cm)': -1.00,
      'A4 (21 × 29,7 cm)': 3.00,
      otro: 3.00
    },
    acabado: { Brillo: 0.00, Mate: 0.80, 'Soft touch': 1.60 },
    papel: { 'Offset blanco': 0.00, 'Crema (ahuesado)': 1.20, 'Blanco semibrillante': 0.90 },

    // Coste fijo de montar la portada personalizada (una vez por encargo)
    disenoPortada: 6.00,

    // Descuento por cantidad: a partir de N ejemplares, % de descuento
    descuentos: [{ desde: 5, pct: 5 }, { desde: 10, pct: 10 }, { desde: 25, pct: 15 }]
  };

  // ---- Utilidades -----------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtEUR(n) { return (n || 0).toFixed(2).replace('.', ',') + '\u00A0€'; }

  var ESTADOS = {
    'en-revision': 'En revisión',
    presupuestado: 'Presupuesto enviado',
    aceptado: 'Aceptado',
    'en-produccion': 'En producción',
    enviado: 'Enviado',
    cancelado: 'Cancelado'
  };

  // ---- Referencias del DOM --------------------------------------------------
  var loginNotice = document.getElementById('customLoginNotice');
  var formWrap = document.getElementById('customFormWrap');
  var doneBox = document.getElementById('customDone');
  var doneEmail = document.getElementById('customDoneEmail');
  var bookSelect = document.getElementById('customBookSelect');
  var otherTitleWrap = document.getElementById('customOtherTitleWrap');
  var otherTitle = document.getElementById('customOtherTitle');
  var tamanoSel = document.getElementById('customTamano');
  var otherSizeWrap = document.getElementById('customOtherSizeWrap');
  var fileInput = document.getElementById('customCover');
  var preview = document.getElementById('customPreview');
  var previewImg = document.getElementById('customPreviewImg');
  var previewName = document.getElementById('customPreviewName');
  var removeImgBtn = document.getElementById('customRemoveImg');
  var errorBox = document.getElementById('customError');
  var progress = document.getElementById('customProgress');
  var progressBar = document.getElementById('customProgressBar');
  var progressText = document.getElementById('customProgressText');
  var submitBtn = document.getElementById('customSubmit');
  var quoteBox = document.getElementById('customQuote');
  var quoteValue = document.getElementById('customQuoteValue');
  var listWrap = document.getElementById('customList');
  var listEmpty = document.getElementById('customListEmpty');
  var anotherBtn = document.getElementById('customAnotherBtn');

  var usuario = null;
  var imagenLista = null; // { blob, nombre, tipo }

  // ---- Desplegable de títulos ----------------------------------------------
  function rellenarLibros() {
    var libros = window.BOOKS || [];
    var grupos = {};
    libros.forEach(function (b) {
      var g = b.categoryLabel || 'Catálogo';
      (grupos[g] = grupos[g] || []).push(b);
    });

    var html = '<option value="">Elige un título del catálogo…</option>';
    Object.keys(grupos).sort().forEach(function (g) {
      html += '<optgroup label="' + esc(g) + '">';
      grupos[g]
        .slice()
        .sort(function (a, b) { return a.title.localeCompare(b.title, 'es'); })
        .forEach(function (b) {
          html += '<option value="' + esc(b.id) + '" data-precio="' + (b.price || 0) + '">' + esc(b.title) + '</option>';
        });
      html += '</optgroup>';
    });
    html += '<option value="__otro__">Otro título que no está en la web</option>';
    bookSelect.innerHTML = html;
  }

  bookSelect.addEventListener('change', function () {
    var otro = bookSelect.value === '__otro__';
    otherTitleWrap.hidden = !otro;
    otherTitle.required = otro;
    calcularPresupuesto();
  });

  tamanoSel.addEventListener('change', function () {
    otherSizeWrap.hidden = tamanoSel.value !== 'otro';
    calcularPresupuesto();
  });

  form.addEventListener('input', calcularPresupuesto);
  form.addEventListener('change', calcularPresupuesto);

  // ---- Presupuesto automático (solo si PRESUPUESTO.activo) ------------------
  function calcularPresupuesto() {
    if (!PRESUPUESTO.activo) return;
    var datos = new FormData(form);
    var cantidad = Math.max(1, parseInt(datos.get('cantidad'), 10) || 1);

    var base = PRESUPUESTO.baseOtroTitulo;
    var opt = bookSelect.options[bookSelect.selectedIndex];
    if (opt && opt.dataset && opt.dataset.precio) base = parseFloat(opt.dataset.precio) || base;

    var unidad = base +
      (PRESUPUESTO.encuadernacion[datos.get('encuadernacion')] || 0) +
      (PRESUPUESTO.tamano[datos.get('tamano')] || 0) +
      (PRESUPUESTO.acabado[datos.get('acabado')] || 0) +
      (PRESUPUESTO.papel[datos.get('papel')] || 0);

    var total = unidad * cantidad + PRESUPUESTO.disenoPortada;

    var pct = 0;
    PRESUPUESTO.descuentos.forEach(function (d) { if (cantidad >= d.desde) pct = d.pct; });
    if (pct) total = total * (1 - pct / 100);

    quoteBox.hidden = false;
    quoteValue.textContent = fmtEUR(total);

    // ---- PUNTO DE ENGANCHE ------------------------------------------------
    // Cuando PRESUPUESTO.permitirComprar sea true, aquí es donde añadiríamos
    // el botón "Comprar ahora" que mete este encargo en el carrito con el
    // precio calculado y sigue al checkout normal (js/cart.js + Stripe).
    // -----------------------------------------------------------------------
  }

  // ---- Imagen de portada ----------------------------------------------------
  var MAX_ENTRADA = 12 * 1024 * 1024; // 12 MB de entrada
  var MAX_LADO = 2000;                 // px del lado mayor tras redimensionar

  function comprimirImagen(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        if (escala === 1 && file.size <= 1.5 * 1024 * 1024) {
          URL.revokeObjectURL(url);
          return resolve({ blob: file, tipo: file.type, ext: (file.name.split('.').pop() || 'jpg') });
        }
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('No se ha podido procesar la imagen.'));
          resolve({ blob: blob, tipo: 'image/jpeg', ext: 'jpg' });
        }, 'image/jpeg', 0.88);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('No hemos podido leer esa imagen. Prueba con otra.'));
      };
      img.src = url;
    });
  }

  fileInput.addEventListener('change', function () {
    errorBox.hidden = true;
    var file = fileInput.files && fileInput.files[0];
    imagenLista = null;
    if (!file) { preview.hidden = true; return; }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      mostrarError('La portada tiene que ser una imagen JPG, PNG o WEBP.');
      fileInput.value = '';
      preview.hidden = true;
      return;
    }
    if (file.size > MAX_ENTRADA) {
      mostrarError('La imagen pesa demasiado (máximo 12 MB). Prueba a reducirla un poco.');
      fileInput.value = '';
      preview.hidden = true;
      return;
    }

    previewImg.src = URL.createObjectURL(file);
    previewName.textContent = file.name + ' · ' + Math.round(file.size / 1024) + ' KB';
    preview.hidden = false;

    comprimirImagen(file).then(function (res) {
      imagenLista = { blob: res.blob, tipo: res.tipo, ext: res.ext, nombre: file.name };
    }).catch(function (err) {
      mostrarError(err.message);
      fileInput.value = '';
      preview.hidden = true;
    });
  });

  removeImgBtn.addEventListener('click', function () {
    fileInput.value = '';
    imagenLista = null;
    preview.hidden = true;
  });

  function mostrarError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---- Sesión ---------------------------------------------------------------
  window.onAuthReady = function (user) {
    usuario = user || null;
    loginNotice.hidden = !!user;
    formWrap.hidden = !user;
    if (!user) return;

    document.getElementById('customNombre').value = user.displayName || '';
    document.getElementById('customEmail').value = user.email || '';
    rellenarLibros();
    cargarMisEncargos();
  };

  // ---- Envío ----------------------------------------------------------------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    if (!usuario || !window.fbDb || typeof firebase === 'undefined' || !firebase.storage) {
      return mostrarError('No hemos podido conectar. Recarga la página e inténtalo de nuevo.');
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!imagenLista) {
      return mostrarError('Sube la imagen que quieres en la portada antes de enviar la solicitud.');
    }

    var datos = new FormData(form);
    var libroId = bookSelect.value;
    var libroTitulo = libroId === '__otro__'
      ? (datos.get('otroTitulo') || '').toString().trim()
      : bookSelect.options[bookSelect.selectedIndex].text;

    if (!libroTitulo) return mostrarError('Dinos qué título quieres encargar.');

    submitBtn.disabled = true;
    progress.hidden = false;
    progressText.textContent = 'Subiendo tu imagen…';
    progressBar.style.width = '5%';

    var ref = firebase.storage().ref()
      .child('encargos/' + usuario.uid + '/' + Date.now() + '.' + imagenLista.ext);

    var tarea = ref.put(imagenLista.blob, { contentType: imagenLista.tipo });

    tarea.on('state_changed', function (snap) {
      var pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 90 : 30;
      progressBar.style.width = Math.max(5, pct).toFixed(0) + '%';
    });

    tarea.then(function () {
      return ref.getDownloadURL();
    }).then(function (url) {
      progressText.textContent = 'Guardando tu solicitud…';
      progressBar.style.width = '95%';

      var tamano = datos.get('tamano') === 'otro'
        ? ((datos.get('otroTamano') || '').toString().trim() || 'A medida')
        : datos.get('tamano');

      return window.fbDb.collection('encargos').add({
        uid: usuario.uid,
        estado: 'en-revision',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        libroId: libroId === '__otro__' ? '' : libroId,
        libroTitulo: libroTitulo,
        cantidad: Math.max(1, parseInt(datos.get('cantidad'), 10) || 1),
        encuadernacion: (datos.get('encuadernacion') || '').toString(),
        tamano: tamano.toString(),
        acabado: (datos.get('acabado') || '').toString(),
        papel: (datos.get('papel') || '').toString(),
        textoPortada: (datos.get('textoPortada') || '').toString().trim(),
        notas: (datos.get('notas') || '').toString().trim(),
        clienteNombre: (datos.get('nombre') || '').toString().trim(),
        clienteEmail: (datos.get('email') || '').toString().trim(),
        clienteTelefono: (datos.get('telefono') || '').toString().trim(),
        portadaUrl: url,
        portadaPath: ref.fullPath
      });
    }).then(function () {
      progressBar.style.width = '100%';
      doneEmail.textContent = (datos.get('email') || usuario.email || '').toString();
      formWrap.hidden = true;
      doneBox.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      form.reset();
      imagenLista = null;
      preview.hidden = true;
      quoteBox.hidden = true;
    }).catch(function (err) {
      console.error('Error al enviar el encargo personalizado', err);
      var msg = 'No hemos podido enviar tu solicitud. Inténtalo de nuevo en unos minutos.';
      if (err && err.code === 'storage/unauthorized') {
        msg = 'No hemos podido subir la imagen. Cierra sesión, vuelve a entrar e inténtalo otra vez.';
      }
      mostrarError(msg);
    }).finally(function () {
      submitBtn.disabled = false;
      progress.hidden = true;
      progressBar.style.width = '0%';
    });
  });

  anotherBtn.addEventListener('click', function () {
    doneBox.hidden = true;
    formWrap.hidden = false;
    if (usuario) {
      document.getElementById('customNombre').value = usuario.displayName || '';
      document.getElementById('customEmail').value = usuario.email || '';
    }
    cargarMisEncargos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- Mis solicitudes ------------------------------------------------------
  function cargarMisEncargos() {
    if (!usuario || !window.fbDb) return;
    window.fbDb.collection('encargos').where('uid', '==', usuario.uid).get()
      .then(function (snap) {
        var docs = [];
        snap.forEach(function (d) {
          var data = d.data();
          data._id = d.id;
          docs.push(data);
        });
        // Ordenamos aquí (y no en Firestore) para no necesitar un índice extra.
        docs.sort(function (a, b) {
          var fa = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
          var fb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
          return fb - fa;
        });

        listEmpty.hidden = docs.length > 0;
        listWrap.innerHTML = docs.map(function (e) {
          var fecha = e.createdAt && e.createdAt.toDate
            ? e.createdAt.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'Procesando…';
          var precio = typeof e.precioFinal === 'number'
            ? '<p class="custom-list-precio">Precio final: <strong>' + fmtEUR(e.precioFinal) + '</strong></p>'
            : '';
          return '<article class="custom-list-item">' +
            '<div class="custom-list-head">' +
              '<h3>' + esc(e.libroTitulo || 'Encargo') + '</h3>' +
              '<span class="custom-badge custom-badge--' + esc(e.estado || 'en-revision') + '">' +
                esc(ESTADOS[e.estado] || 'En revisión') + '</span>' +
            '</div>' +
            '<p class="custom-list-meta">' + esc(e.cantidad || 1) + ' ejemplar(es) · ' +
              esc(e.encuadernacion || '') + ' · ' + esc(e.tamano || '') + '</p>' +
            '<p class="custom-list-meta">Solicitado el ' + fecha + '</p>' +
            precio +
          '</article>';
        }).join('');
      })
      .catch(function (err) {
        console.error('No se han podido cargar tus encargos', err);
      });
  }
})();
