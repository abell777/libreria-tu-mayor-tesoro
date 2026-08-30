// ==========================================================================
// Checkout — exige sesión iniciada, pide los datos de envío, guarda el
// pedido en Firestore y envía los correos de confirmación (cliente + tienda).
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
  });

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

      var subtotal = Cart.totalPrice();
      var envioGratis = subtotal >= 40;
      var gastosEnvio = envioGratis ? 0 : 3.95;
      var total = subtotal + gastosEnvio;
      var numero = 'LT-' + Date.now().toString().slice(-6);

      var submitBtn = shippingForm.querySelector('button[type="submit"]');
      var textoOriginal = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Procesando…';

      var pedido = {
        numero: numero,
        uid: user.uid,
        clienteNombre: user.displayName || envio.nombre,
        clienteEmail: user.email,
        envio: envio,
        items: items.map(function (i) {
          return { titulo: i.title, formato: i.format, cantidad: i.qty, precio: i.price };
        }),
        subtotal: subtotal,
        gastosEnvio: gastosEnvio,
        total: total,
        estado: 'pendiente',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      (window.fbDb ? window.fbDb.collection('pedidos').add(pedido) : Promise.resolve())
        .then(function () {
          return enviarCorreos(pedido);
        })
        .catch(function (err) {
          console.error('Error al guardar el pedido', err);
        })
        .then(function () {
          Cart.clear();
          mostrarConfirmacion(numero, total);
          submitBtn.disabled = false;
          submitBtn.textContent = textoOriginal;
          shippingForm.reset();
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
