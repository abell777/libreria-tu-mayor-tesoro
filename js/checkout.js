// ==========================================================================
// Checkout — exige sesión iniciada, pide los datos de envío y llama a la
// Cloud Function "crearPedido" (functions/index.js), que recalcula el
// precio real en el servidor, guarda el pedido en Firestore y devuelve
// los datos ya verificados. Después se envían los correos de confirmación
// (cliente + tienda) con esos datos reales.
// ==========================================================================
(function () {
  var checkoutBtn = document.getElementById('checkoutBtn');
  if (!checkoutBtn) return;

  var loginNotice = document.getElementById('checkoutLoginNotice');
  var shippingSection = document.getElementById('checkoutShipping');
  var shippingForm = document.getElementById('shippingForm');
  var confirmation = document.getElementById('orderConfirmation');
  var cartLayout = document.getElementById('cartLayout');

  checkoutBtn.addEventListener('click', function () {
    var user = window.fbAuth ? window.fbAuth.currentUser : null;
    if (!user) {
      if (loginNotice) loginNotice.hidden = false;
      if (shippingSection) shippingSection.hidden = true;
      if (loginNotice) loginNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (loginNotice) loginNotice.hidden = true;
    if (shippingSection) {
      shippingSection.hidden = false;
      shippingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    precargarDireccionGuardada(user);
  });

  // Si el cliente tiene una dirección guardada en su panel de cuenta
  // (predeterminada, o la única que tenga), se precarga en el formulario.
  function precargarDireccionGuardada(user) {
    if (!window.fbDb || !shippingForm) return;
    window.fbDb.collection('usuarios').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var direcciones = doc.data().direcciones || [];
      if (direcciones.length === 0) return;
      var elegida = direcciones.filter(function (d) { return d.predeterminada; })[0] || direcciones[0];
      if (!elegida) return;
      shippingForm.elements.nombre.value = elegida.nombre || user.displayName || '';
      shippingForm.elements.direccion.value = elegida.direccion || '';
      shippingForm.elements.ciudad.value = elegida.ciudad || '';
      shippingForm.elements.cp.value = elegida.cp || '';
      shippingForm.elements.telefono.value = elegida.telefono || '';
    }).catch(function (err) {
      console.error('Error al precargar la dirección guardada', err);
    });
  }

  if (shippingForm) {
    shippingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      if (!user) return;

      var items = Cart.getItems();
      if (items.length === 0) return;

      var fd = new FormData(shippingForm);
      var envio = {
        nombre: fd.get('nombre'),
        direccion: fd.get('direccion'),
        ciudad: fd.get('ciudad'),
        cp: fd.get('cp'),
        telefono: fd.get('telefono')
      };

      var submitBtn = shippingForm.querySelector('button[type="submit"]');
      var textoOriginal = submitBtn.textContent;
      var checkoutErrorEl = document.getElementById('checkoutError');
      if (checkoutErrorEl) checkoutErrorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Procesando…';

      // Al servidor solo le mandamos el id y la cantidad de cada libro:
      // el precio, el título y el formato los decide siempre la Cloud
      // Function "crearPedido" a partir de su propio catálogo. Así nadie
      // puede manipular el precio desde la consola del navegador.
      var itemsParaEnviar = items.map(function (i) {
        return { id: i.id, qty: i.qty };
      });

      var crearPedido = firebase.functions().httpsCallable('crearPedido');

      crearPedido({ items: itemsParaEnviar, envio: envio })
        .then(function (result) {
          var pedido = result.data;
          // El pedido ya está guardado: si fallan los correos, no es motivo
          // para decirle al cliente que su compra no se ha registrado.
          return enviarCorreos(pedido).catch(function (err) {
            console.error('Error al enviar los correos de confirmación', err);
          }).then(function () {
            Cart.clear();
            mostrarConfirmacion(pedido.numero, pedido.total);
            shippingForm.reset();
          });
        })
        .catch(function (err) {
          // Aquí sí ha fallado el propio pedido: no lo confirmamos ni
          // vaciamos el carrito, para que el cliente pueda reintentarlo.
          console.error('Error al guardar el pedido', err);
          if (checkoutErrorEl) checkoutErrorEl.hidden = false;
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = textoOriginal;
        });
    });
  }

  function enviarCorreos(pedido) {
    if (typeof emailjs === 'undefined' || typeof emailjsConfig === 'undefined') return Promise.resolve();

    var listaItems = pedido.items.map(function (i) {
      return i.cantidad + ' × ' + i.titulo + ' (' + i.formato + ')';
    }).join('\n');

    var ahora = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

    var datosComunes = {
      name: pedido.clienteNombre,
      email: pedido.clienteEmail,
      time: ahora,
      numero_pedido: pedido.numero,
      cliente_nombre: pedido.clienteNombre,
      cliente_email: pedido.clienteEmail,
      lista_articulos: listaItems,
      total: pedido.total.toFixed(2).replace('.', ',') + ' €',
      direccion_envio: pedido.envio.direccion + ', ' + pedido.envio.cp + ' ' + pedido.envio.ciudad,
      telefono: pedido.envio.telefono
    };

    var correoCliente = emailjs.send(
      emailjsConfig.serviceId,
      emailjsConfig.customerTemplateId,
      Object.assign({ to_email: pedido.clienteEmail }, datosComunes)
    );

    var correoTienda = emailjs.send(
      emailjsConfig.serviceId,
      emailjsConfig.ownerTemplateId,
      Object.assign({ to_email: emailjsConfig.ownerEmail }, datosComunes)
    );

    return Promise.all([correoCliente, correoTienda]).catch(function (err) {
      console.error('Error al enviar los correos de confirmación', err);
    });
  }

  function mostrarConfirmacion(numero, total) {
    if (cartLayout) cartLayout.hidden = true;
    if (shippingSection) shippingSection.hidden = true;
    if (confirmation) {
      confirmation.hidden = false;
      var num = confirmation.querySelector('[data-order-number]');
      var tot = confirmation.querySelector('[data-order-total]');
      if (num) num.textContent = numero;
      if (tot) tot.textContent = fmtEUR(total);
      confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
})();
