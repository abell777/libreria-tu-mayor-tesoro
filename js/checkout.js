// ==========================================================================
// Checkout — exige sesión iniciada, pide los datos de envío, llama a la
// Cloud Function "crearPedido" (functions/index.js) para guardar el pedido
// con el precio recalculado en servidor, y luego a "crearSesionPago" para
// abrir una sesión de pago REAL en Stripe (tarjeta, Bizum, y lo que tengas
// activado en tu panel de Stripe). El cliente paga en la página de Stripe
// y vuelve aquí mismo (carrito.html?pago=exito|cancelado&pedido=ID).
//
// El pedido NO se da por pagado hasta que Firestore confirma "pagado: true"
// — ese campo solo lo puede cambiar la Cloud Function "stripeWebhook"
// cuando Stripe avisa de que el cobro se ha completado de verdad. Así que
// aunque alguien cierre la pestaña o manipule la URL de vuelta, nunca se
// muestra "pedido confirmado" ni se envían los correos sin un pago real.
// ==========================================================================
(function () {
  var checkoutBtn = document.getElementById('checkoutBtn');
  var loginNotice = document.getElementById('checkoutLoginNotice');
  var shippingSection = document.getElementById('checkoutShipping');
  var shippingForm = document.getElementById('shippingForm');
  var confirmation = document.getElementById('orderConfirmation');
  var paymentPending = document.getElementById('paymentPending');
  var paymentCancelled = document.getElementById('paymentCancelled');
  var retryPaymentBtn = document.getElementById('retryPaymentBtn');
  var cartLayout = document.getElementById('cartLayout');

  if (checkoutBtn) {
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
  }

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
      if (shippingForm.elements.addressId) shippingForm.elements.addressId.value = elegida.id || '';
    }).catch(function (err) {
      console.error('Error al precargar la dirección guardada', err);
    });
  }

  // Guarda (o actualiza, si ya venía de una dirección precargada) la
  // dirección de envío en el panel de cuenta del cliente, para que la
  // próxima vez no tenga que volver a escribirla. No bloquea el pago si
  // falla: es una comodidad, no un requisito para completar la compra.
  function guardarDireccionSiProcede(user, envio, addressId) {
    if (!window.fbDb) return Promise.resolve();
    return window.fbDb.collection('usuarios').doc(user.uid).get().then(function (doc) {
      var direcciones = (doc.exists && doc.data().direcciones) || [];
      var existente = addressId && direcciones.filter(function (d) { return d.id === addressId; })[0];
      var nueva = {
        id: addressId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
        etiqueta: (existente && existente.etiqueta) || 'Dirección de envío',
        nombre: envio.nombre,
        direccion: envio.direccion,
        ciudad: envio.ciudad,
        cp: envio.cp,
        telefono: envio.telefono,
        predeterminada: true
      };
      var siguientes = direcciones.filter(function (d) { return d.id !== nueva.id; });
      siguientes.forEach(function (d) { d.predeterminada = false; });
      siguientes.push(nueva);
      return window.fbDb.collection('usuarios').doc(user.uid).set({ direcciones: siguientes }, { merge: true });
    }).catch(function (err) {
      console.error('No se pudo guardar la dirección para la próxima compra', err);
    });
  }

  // Traduce el error que devuelve Firebase a un mensaje que el cliente
  // entienda. "internal"/"unavailable" suele ser un problema temporal de
  // conexión o del servidor; el resto son casos concretos (carrito vacío,
  // datos incorrectos, sesión caducada...) que conviene explicar tal cual.
  function mensajeErrorPedido(err) {
    var codigo = err && err.code;
    if (codigo === 'unauthenticated') {
      return 'Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.';
    }
    if (codigo === 'invalid-argument' && err.message) {
      return err.message;
    }
    if (codigo === 'internal' || codigo === 'unavailable' || codigo === 'deadline-exceeded') {
      return 'No se ha podido registrar tu pedido. Comprueba tu conexión e inténtalo de nuevo; si el problema continúa, escríbenos a libreriamayortesoro@gmail.com.';
    }
    return (err && err.message) || 'No se ha podido registrar tu pedido. Inténtalo de nuevo o escríbenos a libreriamayortesoro@gmail.com.';
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
      var guardarDireccion = fd.get('guardarDireccion') === 'on';
      var addressIdActual = fd.get('addressId') || '';
      if (guardarDireccion) guardarDireccionSiProcede(user, envio, addressIdActual);

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
      var crearSesionPago = firebase.functions().httpsCallable('crearSesionPago');

      crearPedido({ items: itemsParaEnviar, envio: envio })
        .then(function (result) {
          var pedido = result.data;
          return crearSesionPago({ pedidoId: pedido.id }).then(function (sesion) {
            // Redirige a la página de pago real de Stripe. El carrito se
            // vacía y se confirma el pedido solo cuando el cliente vuelva
            // aquí con el pago ya confirmado (ver comprobarVueltaDeStripe).
            window.location.href = sesion.data.url;
          });
        })
        .catch(function (err) {
          console.error('Error al preparar el pago', err);
          if (checkoutErrorEl) {
            checkoutErrorEl.textContent = mensajeErrorPedido(err);
            checkoutErrorEl.hidden = false;
            checkoutErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          submitBtn.disabled = false;
          submitBtn.textContent = textoOriginal;
        });
    });
  }

  if (retryPaymentBtn) {
    retryPaymentBtn.addEventListener('click', function () {
      var params = new URLSearchParams(window.location.search);
      var pedidoId = params.get('pedido');
      if (!pedidoId) return;
      retryPaymentBtn.disabled = true;
      retryPaymentBtn.textContent = 'Redirigiendo…';
      var crearSesionPago = firebase.functions().httpsCallable('crearSesionPago');
      crearSesionPago({ pedidoId: pedidoId })
        .then(function (sesion) {
          window.location.href = sesion.data.url;
        })
        .catch(function (err) {
          console.error('Error al reintentar el pago', err);
          retryPaymentBtn.disabled = false;
          retryPaymentBtn.textContent = 'Reintentar pago';
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

  function ocultarTodo() {
    if (cartLayout) cartLayout.hidden = true;
    if (shippingSection) shippingSection.hidden = true;
    if (paymentPending) paymentPending.hidden = true;
    if (paymentCancelled) paymentCancelled.hidden = true;
    if (confirmation) confirmation.hidden = true;
    var loginNoticeEl = document.getElementById('checkoutLoginNotice');
    if (loginNoticeEl) loginNoticeEl.hidden = true;
  }

  function mostrarConfirmacion(numero, total) {
    ocultarTodo();
    if (confirmation) {
      confirmation.hidden = false;
      var num = confirmation.querySelector('[data-order-number]');
      var tot = confirmation.querySelector('[data-order-total]');
      if (num) num.textContent = numero;
      if (tot) tot.textContent = fmtEUR(total);
      confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ------------------------------------------------------------------------
  // Vuelta desde Stripe: carrito.html?pago=exito&pedido=ID&session_id=...
  // o carrito.html?pago=cancelado&pedido=ID
  // ------------------------------------------------------------------------
  function comprobarVueltaDeStripe() {
    var params = new URLSearchParams(window.location.search);
    var pago = params.get('pago');
    var pedidoId = params.get('pedido');
    if (!pago || !pedidoId) return;

    if (pago === 'cancelado') {
      ocultarTodo();
      if (paymentCancelled) {
        paymentCancelled.hidden = false;
        paymentCancelled.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (pago !== 'exito') return;

    ocultarTodo();
    if (paymentPending) paymentPending.hidden = false;

    if (!window.fbAuth || !window.fbDb) return;

    // Espera a que sepamos si hay sesión iniciada antes de leer el pedido
    // (las reglas de Firestore exigen ser el dueño del pedido para leerlo).
    var yaProcesado = false;
    window.fbAuth.onAuthStateChanged(function (user) {
      if (!user || yaProcesado) return;
      esperarConfirmacionDePago(pedidoId);
    });
  }

  // Sondea Firestore hasta que el webhook de Stripe marque el pedido como
  // pagado (normalmente tarda muy pocos segundos), con un tiempo máximo de
  // espera para no dejar a alguien mirando la pantalla indefinidamente.
  function esperarConfirmacionDePago(pedidoId) {
    var intentos = 0;
    var maxIntentos = 20; // ~30s en total
    var flagCorreo = 'correoEnviado:' + pedidoId;

    function intentar() {
      intentos++;
      window.fbDb.collection('pedidos').doc(pedidoId).get().then(function (doc) {
        if (!doc.exists) return;
        var pedido = doc.data();

        if (pedido.pagado) {
          if (!sessionStorage.getItem(flagCorreo)) {
            sessionStorage.setItem(flagCorreo, '1');
            enviarCorreos(pedido).catch(function (err) {
              console.error('Error al enviar los correos de confirmación', err);
            });
          }
          Cart.clear();
          mostrarConfirmacion(pedido.numero, pedido.total);
          // Limpia la URL para que un refresco no vuelva a disparar esto.
          history.replaceState(null, '', 'carrito.html');
          return;
        }

        if (intentos < maxIntentos) {
          setTimeout(intentar, 1500);
        } else {
          // El webhook puede tardar más de lo normal (poco frecuente). No
          // asustamos al cliente: el pago en Stripe puede haberse completado
          // igualmente y el pedido se actualizará solo en cuanto llegue.
          if (paymentPending) {
            var texto = paymentPending.querySelector('p');
            if (texto) texto.textContent = 'Estamos terminando de confirmar tu pago. Si tarda más de un minuto, escríbenos a libreriamayortesoro@gmail.com con tu número de pedido y no te preocupes: no se te cobrará dos veces.';
          }
        }
      }).catch(function (err) {
        console.error('Error al comprobar el estado del pedido', err);
      });
    }

    intentar();
  }

  comprobarVueltaDeStripe();
})();
