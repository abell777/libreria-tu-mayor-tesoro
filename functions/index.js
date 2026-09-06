// ==========================================================================
// Cloud Functions — Librería tu mayor tesoro
//
// "crearPedido" es la ÚNICA forma de crear un pedido a partir de ahora.
// El cliente (js/checkout.js) ya no escribe directamente en Firestore:
// solo manda el id y la cantidad de cada libro, y esta función recalcula
// el precio real desde el catálogo de aquí abajo. Así da igual lo que
// alguien manipule en la consola del navegador — el importe que se
// guarda y el que se cobra son siempre el real.
//
// 👉 IMPORTANTE: si añades, quitas o cambias el precio de un libro en
// js/books-data.js, actualiza también el objeto CATALOGO de aquí abajo.
// Son dos copias de la misma información a propósito (una para pintar la
// tienda rápido sin depender de la red, otra para que el servidor pueda
// confiar en sí mismo). Si algún día te cansas de mantener las dos, se
// puede mover el catálogo entero a Firestore — dímelo y lo hacemos.
// ==========================================================================
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ---- Catálogo oficial de precios (debe coincidir con js/books-data.js) ----
const CATALOGO = {
  "el-conflicto-de-los-siglos": {
    title: "El Conflicto de los Siglos",
    format: "Tapa dura",
    price: 18.54,
  },
  "el-deseado-de-todas-las-gentes": {
    title: "El Deseado de Todas las Gentes",
    format: "Tapa blanda, A5",
    price: 13.20,
  },
  "historia-de-los-patriarcas-y-profetas": {
    title: "Historia de los Patriarcas y Profetas",
    format: "Edición tapa dura",
    price: 25.20,
  },
  "profetas-y-reyes": {
    title: "Profetas y Reyes",
    format: "Edición tapa blanda",
    price: 10.83,
  },
};

const MAX_ITEMS = 30;
const MAX_QTY = 20;
const FREE_SHIPPING_FROM = 40;
const SHIPPING_COST = 3.95;

function textoValido(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
}

exports.crearPedido = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para completar la compra.");
  }

  const data = request.data || {};
  const itemsSolicitados = Array.isArray(data.items) ? data.items : [];
  const envio = data.envio || {};

  if (itemsSolicitados.length === 0) {
    throw new HttpsError("invalid-argument", "El carrito está vacío.");
  }
  if (itemsSolicitados.length > MAX_ITEMS) {
    throw new HttpsError("invalid-argument", "Hay demasiados artículos distintos en el pedido.");
  }
  if (
    !textoValido(envio.nombre, 120) ||
    !textoValido(envio.direccion, 200) ||
    !textoValido(envio.ciudad, 120) ||
    !textoValido(envio.cp, 20) ||
    !textoValido(envio.telefono, 40)
  ) {
    throw new HttpsError("invalid-argument", "Faltan datos de envío, o son demasiado largos.");
  }

  // Recalcula CADA artículo contra el catálogo de arriba: precio, título
  // y formato siempre vienen de aquí, nunca de lo que mande el navegador.
  const itemsFinales = [];
  for (const item of itemsSolicitados) {
    const libro = item && CATALOGO[item.id];
    if (!libro) {
      throw new HttpsError("invalid-argument", "Uno de los libros del pedido ya no existe en el catálogo.");
    }
    const cantidad = Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1));
    itemsFinales.push({
      id: item.id,
      titulo: libro.title,
      formato: libro.format,
      precio: libro.price,
      cantidad: cantidad,
    });
  }

  const subtotal = itemsFinales.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
  const gastosEnvio = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
  const subtotalRedondeado = Math.round(subtotal * 100) / 100;
  const total = Math.round((subtotal + gastosEnvio) * 100) / 100;

  // Nombre y correo del cliente: se leen de la cuenta autenticada, no del
  // formulario, para que nadie pueda hacerse pasar por otra persona.
  const usuario = await admin.auth().getUser(auth.uid);
  const numero = "LT-" + Date.now().toString().slice(-6);

  const pedido = {
    numero,
    uid: auth.uid,
    clienteNombre: usuario.displayName || envio.nombre.trim(),
    clienteEmail: usuario.email || "",
    envio: {
      nombre: envio.nombre.trim(),
      direccion: envio.direccion.trim(),
      ciudad: envio.ciudad.trim(),
      cp: envio.cp.trim(),
      telefono: envio.telefono.trim(),
    },
    items: itemsFinales,
    subtotal: subtotalRedondeado,
    gastosEnvio,
    total,
    estado: "pendiente",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("pedidos").add(pedido);

  // Devolvemos al navegador el pedido ya calculado por el servidor, para
  // que pueda mostrar la confirmación y enviar los correos con estos
  // datos reales (no con los que él mismo había propuesto).
  return {
    id: ref.id,
    numero: pedido.numero,
    items: pedido.items,
    subtotal: pedido.subtotal,
    gastosEnvio: pedido.gastosEnvio,
    total: pedido.total,
    clienteNombre: pedido.clienteNombre,
    clienteEmail: pedido.clienteEmail,
    envio: pedido.envio,
  };
});
