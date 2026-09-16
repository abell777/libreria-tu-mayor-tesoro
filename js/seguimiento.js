// ==========================================================================
// Seguimiento de pedido (seguimiento.html)
// --------------------------------------------------------------------------
// No requiere sesión iniciada: el número de pedido + el email de compra
// hacen de "contraseña" del pedido. Todo el trabajo de comprobar que
// coinciden lo hace la Cloud Function "buscarPedidoPublico" (con el SDK de
// administrador, así que ve el pedido aunque el que pregunta no haya
// iniciado sesión) — aquí solo se pinta el resultado.
// ==========================================================================
(function () {
  var form = document.getElementById('trackingForm');
  if (!form) return;

  var errorBox = document.getElementById('trackingError');
  var submitBtn = document.getElementById('trackingSubmit');
  var resultBox = document.getElementById('trackingResult');
  var anotherBtn = document.getElementById('trackingAnotherBtn');

  var ESTADOS = {
    pendiente: 'Pedido recibido',
    enviado: 'Enviado',
    entregado: 'Entregado'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtEUR(n) { return (n || 0).toFixed(2).replace('.', ',') + '\u00A0€'; }

  function mostrarError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    if (typeof firebase === 'undefined' || !firebase.apps.length) {
      return mostrarError('No hemos podido conectar. Recarga la página e inténtalo de nuevo.');
    }

    var numero = document.getElementById('trackingNumero').value.trim();
    var email = document.getElementById('trackingEmail').value.trim();
    if (!numero || !email) {
      return mostrarError('Escribe el número de pedido y el correo con el que compraste.');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Consultando…';

    firebase.functions().httpsCallable('buscarPedidoPublico')({ numero: numero, email: email })
      .then(function (res) {
        pintarPedido(res.data);
        form.hidden = true;
        document.querySelector('.tracking-help').hidden = true;
        resultBox.hidden = false;
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        console.error('Error al consultar el pedido', err);
        mostrarError(err && err.message
          ? err.message
          : 'No hemos encontrado ningún pedido con esos datos. Revisa el número y el correo.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Consultar mi pedido';
      });
  });

  anotherBtn.addEventListener('click', function () {
    resultBox.hidden = true;
    form.hidden = false;
    document.querySelector('.tracking-help').hidden = false;
    form.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function pintarPedido(pedido) {
    document.getElementById('trackingResultNumero').textContent = pedido.numero;
    document.getElementById('trackingResultEstado').textContent = ESTADOS[pedido.estado] || pedido.estado;

    var pagoEl = document.getElementById('trackingResultPago');
    pagoEl.textContent = pedido.pagado ? 'Pagado' : 'Pago pendiente';
    pagoEl.className = 'pay-badge pay-badge--' + (pedido.pagado ? 'ok' : 'pendiente');

    var ORDEN = ['pendiente', 'enviado', 'entregado'];
    var actual = ORDEN.indexOf(pedido.estado);
    document.querySelectorAll('#trackingSteps li').forEach(function (li) {
      var i = ORDEN.indexOf(li.getAttribute('data-step'));
      li.classList.toggle('is-done', actual >= 0 && i <= actual);
      li.classList.toggle('is-current', i === actual);
    });

    document.getElementById('trackingItems').innerHTML = (pedido.items || []).map(function (it) {
      return '<li>' + it.cantidad + ' × ' + esc(it.titulo) + (it.formato ? ' (' + esc(it.formato) + ')' : '') +
        ' — ' + fmtEUR(it.precio * it.cantidad) + '</li>';
    }).join('');

    document.getElementById('trackingSubtotal').textContent = fmtEUR(pedido.subtotal);
    document.getElementById('trackingEnvio').textContent = pedido.gastosEnvio ? fmtEUR(pedido.gastosEnvio) : 'Gratis';
    var descRow = document.getElementById('trackingDescuentoRow');
    if (pedido.descuento > 0) {
      descRow.hidden = false;
      document.getElementById('trackingDescuento').textContent = '−' + fmtEUR(pedido.descuento);
    } else {
      descRow.hidden = true;
    }
    document.getElementById('trackingTotal').textContent = fmtEUR(pedido.total);

    var envio = pedido.envio || {};
    document.getElementById('trackingDireccion').innerHTML =
      esc(envio.nombre) + '<br>' + esc(envio.direccion) + '<br>' + esc(envio.cp) + ' ' + esc(envio.ciudad);
  }
})();
