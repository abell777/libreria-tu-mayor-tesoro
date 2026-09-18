// ==========================================================================
// "Pide consejo a nuestro librero" — consejo.html
// --------------------------------------------------------------------------
// Manda la consulta por correo a la librería usando el MISMO EmailJS que ya
// usa la web para los pedidos (js/config.js → emailjsConfig). No hace falta
// crear ninguna plantilla nueva ni tocar las reglas de Firestore: la consulta
// llega al buzón de la tienda con la plantilla del dueño
// (ownerTemplateId), reutilizando sus variables:
//
//   name / cliente_nombre .... nombre de quien pregunta
//   email / cliente_email .... su correo (ahí hay que responderle)
//   lista_articulos .......... el texto de la consulta (destinatario,
//                              tipo de lectura y lo que ha escrito)
//   total .................... "Consulta de asesoramiento"
//
// Si algún día quieres una plantilla propia y más bonita para estas
// consultas, créala en EmailJS y cambia solo la constante PLANTILLA de
// aquí abajo por su id.
// ==========================================================================
(function () {
  var form = document.getElementById('adviceForm');
  if (!form) return;

  var PLANTILLA = (typeof emailjsConfig !== 'undefined' && emailjsConfig.ownerTemplateId) || '';

  var errorEl = document.getElementById('adviceError');
  var submitBtn = document.getElementById('adviceSubmit');
  var doneBox = document.getElementById('adviceDone');
  var doneEmail = document.getElementById('adviceDoneEmail');

  function fallar(mensaje) {
    if (errorEl) { errorEl.textContent = mensaje; errorEl.hidden = false; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar mi consulta'; }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (errorEl) errorEl.hidden = true;

    var datos = new FormData(form);
    var nombre = (datos.get('nombre') || '').toString().trim();
    var email = (datos.get('email') || '').toString().trim();
    var mensaje = (datos.get('mensaje') || '').toString().trim();

    if (!nombre || !email || !mensaje) return fallar('Completa tu nombre, tu correo y la consulta.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fallar('Revisa tu dirección de correo.');
    if (!datos.get('privacidad')) return fallar('Necesitamos tu consentimiento para poder responderte.');

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

    var cuerpo =
      'CONSULTA DESDE "PIDE CONSEJO A NUESTRO LIBRERO"\n\n' +
      'Para quién es el libro: ' + (datos.get('destinatario') || '—') + '\n' +
      'Tipo de lectura que prefiere: ' + (datos.get('profundidad') || '—') + '\n\n' +
      'Lo que nos cuenta:\n' + mensaje;

    var ahora = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

    if (typeof emailjs === 'undefined' || !PLANTILLA) {
      return fallar('No hemos podido enviar la consulta. Escríbenos a libreriamayortesoro@gmail.com o por WhatsApp y te atendemos igual.');
    }

    emailjs.send(emailjsConfig.serviceId, PLANTILLA, {
      to_email: emailjsConfig.ownerEmail,
      name: nombre,
      email: email,
      cliente_nombre: nombre,
      cliente_email: email,
      time: ahora,
      numero_pedido: 'CONSEJO',
      lista_articulos: cuerpo,
      total: 'Consulta de asesoramiento',
      direccion_envio: '—',
      telefono: '—',
      enlace_seguimiento: ''
    }).then(function () {
      if (doneEmail) doneEmail.textContent = email;
      form.hidden = true;
      if (doneBox) doneBox.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (err) {
      console.error('No se pudo enviar la consulta', err);
      fallar('No hemos podido enviar la consulta. Inténtalo de nuevo o escríbenos a libreriamayortesoro@gmail.com.');
    });
  });
})();
