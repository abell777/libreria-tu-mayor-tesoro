// ==========================================================================
// Checkout Nativo de Marca Blanca — Librería tu mayor tesoro
//
// Integra Stripe Elements dentro de la misma pantalla del carrito/checkout,
// precarga y guarda direcciones en el perfil de Firestore del cliente, llama
// a "crearPedido" y "crearIntentPago" en el backend, procesa el pago in-site,
// vacía el carrito y envía las notificaciones por EmailJS tras confirmarse.
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

  var stripe = null;
  var elements = null;
  var card = null;

  // ------------------------------------------------------------------------
  // 1. Inicializar Stripe Elements al cargar el DOM
  // ------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var cardElementContainer = document.getElementById('card-element');
    if (!cardElementContainer) return;

    // Sustituye con tu Clave Publicable de Stripe (pk_live_... o pk_test_...)
    stripe = Stripe('TU_STRIPE_PUBLIC_KEY');
    elements = stripe.elements();

    var style = {
      base: {
        color: '#1f2b45',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': { color: '#aab7c4' }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };

    card = elements.create('card', { style: style });
    card.mount('#card-element');

    card.on('change', function (event) {
      var paymentErrors = document.getElementById('payment-errors');
      if (paymentErrors) {
        paymentErrors.textContent = event.error ? event.error.message : '';
      }
    });
  });

  // ------------------------------------------------------------------------
  // 2. Interacción inicial y gestión de direcciones
  // ------------------------------------------------------------------------
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

  function precargarDireccionGuardada(user) {
    if (!window.fbDb || !shippingForm) return;
    window.fbDb.collection('usuarios').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var direcciones = doc.data().direcciones || [];
      if (direcciones.length === 0) return;
      var elegida = direcciones.filter(function (d) { return d.predeterminada; })[0] || direcciones[0];
      if (!elegida) return;
      if (shippingForm.elements.nombre) shippingForm.elements.nombre.value = elegida.nombre || user.displayName || '';
      if (shippingForm.elements.direccion) shippingForm.elements.direccion.value = elegida.direccion || '';
      if (shippingForm.elements.ciudad) shippingForm.elements.ciudad.value = elegida.ciudad || '';
      if (shippingForm.elements.cp) shippingForm.elements.cp.value = elegida.cp || '';
      if (shippingForm.elements.telefono) shippingForm.elements.telefono.value = elegida.telefono || '';
      if (shippingForm.elements.addressId) shippingForm.elements.addressId.value = elegida.id || '';
    }).catch(function (err) {
      console.error('Error al precargar la dirección guardada', err);
    });
  }

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

  // ------------------------------------------------------------------------
  // 3. Procesamiento del pago nativo (Submit del Formulario)
  // ------------------------------------------------------------------------
  var checkoutForm = document.getElementById('checkoutForm') || shippingForm;

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var user = window.fbAuth ? window.fbAuth.currentUser : null;
      var paymentErrors = document.getElementById('payment-errors') || document.getElementById('checkoutError');
      var btnSubmit = document.getElementById('btnSubmitOrder') || checkoutForm.querySelector('button[type="submit"]');
      var textoOriginal = btnSubmit ? btnSubmit.textContent : 'Pagar y completar pedido';

      if (paymentErrors) {
        paymentErrors.textContent = '';
        paymentErrors.hidden = true;
      }

      if (!user) {
        if (paymentErrors) {
          paymentErrors.textContent = 'Debes iniciar sesión para realizar la compra.';
          paymentErrors.hidden = false;
        }
        return;
      }

      var items = Cart.getItems();
      if (items.length === 0) return;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Procesando pago...';
      }

      try {
        var fd = new FormData(checkoutForm);
        var envio = {
          nombre: fd.get('nombre') || (document.getElementById('shippingName') ? document.getElementById('shippingName').value : ''),
          direccion: fd.get('direccion') || (document.getElementById('shippingAddress') ? document.getElementById('shippingAddress').value : ''),
          ciudad: fd.get('ciudad') || (document.getElementById('shippingCity') ? document.getElementById('shippingCity').value : ''),
          cp: fd.get('cp') || (document.getElementById('shippingZip') ? document.getElementById('shippingZip').value : ''),
          telefono: fd.get('telefono') || (document.getElementById('shippingPhone') ? document.getElementById('shippingPhone').value : '')
        };

        var guardarDireccion = fd.get('guardarDireccion') === 'on';
        var addressIdActual = fd.get('addressId') || '';
        if (guardarDireccion) guardarDireccionSiProcede(user, envio, addressIdActual);

        var itemsParaEnviar = items.map(function (i) {
          return { id: i.id, qty: i.qty };
        });

        // Step 1: Crear pedido en backend
        var crearPedidoFn = firebase.functions().httpsCallable('crearPedido');
        var resultadoPedido = await crearPedidoFn({ items: itemsParaEnviar, envio: envio });
        var pedidoId = resultadoPedido.data.id;

        // Step 2: Obtener Client Secret de Stripe
        var crearIntentFn = firebase.functions().httpsCallable('crearIntentPago');
        var resultadoIntent = await crearIntentFn({ pedidoId: pedidoId });
        var clientSecret = resultadoIntent.data.clientSecret;

        // Step 3: Confirmar pago directamente sin salir de la página
        var result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: card,
            billing_details: {
              name: envio.nombre,
              phone: envio.telefono
            }
          }
        });

        if (result.error) {
          if (paymentErrors) {
            paymentErrors.textContent = result.error.message;
            paymentErrors.hidden = false;
          }
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
          }
        } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          window.location.href = 'carrito.html?pago=exito&pedido=' + encodeURIComponent(pedidoId);
        }
      } catch (err) {
        console.error('Error al procesar la transacción:', err);
        if (paymentErrors) {
          paymentErrors.textContent = mensajeErrorPedido(err);
          paymentErrors.hidden = false;
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = textoOriginal;
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // 4. Notificaciones por email y post-procesamiento
  // ------------------------------------------------------------------------
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
    if (loginNotice) loginNotice.hidden = true;
  }

  function mostrarConfirmacion(numero, total) {
    ocultarTodo();
    if (confirmation) {
      confirmation.hidden = false;
      var num = confirmation.querySelector('[data-order-number]');
      var tot = confirmation.querySelector('[data-order-total]');
      if (num) num.textContent = numero;
      if (tot) tot.textContent = typeof fmtEUR === 'function' ? fmtEUR(total) : total.toFixed(2) + ' €';
      confirmation.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ------------------------------------------------------------------------
  // 5. Verificación tras completar el pago
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

    var yaProcesado = false;
    window.fbAuth.onAuthStateChanged(function (user) {
      if (!user || yaProcesado) return;
      yaProcesado = true;
      esperarConfirmacionDePago(pedidoId);
    });
  }

  function esperarConfirmacionDePago(pedidoId) {
    var intentos = 0;
    var maxIntentos = 20;
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
          history.replaceState(null, '', 'carrito.html');
          return;
        }

        if (intentos < maxIntentos) {
          setTimeout(intentar, 1500);
        } else {
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