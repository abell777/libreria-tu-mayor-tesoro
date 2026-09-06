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
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ---- Catálogo oficial (debe coincidir con js/books-data.js) ----
// Incluye también description/cover/category/author porque "productoMeta"
// (más abajo) los necesita para escribir los metadatos de cada ficha de
// producto ANTES de que llegue al navegador — así WhatsApp, Facebook y
// Twitter muestran el título, la portada y el resumen reales del libro al
// compartir un enlace, en vez de los genéricos de la home.
const CATALOGO = {
  "el-conflicto-de-los-siglos": {
    title: "El Conflicto de los Siglos",
    format: "Tapa dura",
    price: 18.54,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-conflicto-de-los-siglos.jpg",
    description: "Un recorrido por la gran lucha entre el bien y el mal a través de la historia, desde la destrucción de Jerusalén hasta la restauración final de la tierra. Un clásico de la literatura devocional adventista, con un lenguaje claro pensado tanto para el estudio personal como para el regalo.",
  },
  "el-deseado-de-todas-las-gentes": {
    title: "El Deseado de Todas las Gentes",
    format: "Tapa blanda, A5",
    price: 13.20,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-deseado-de-todas-las-gentes.jpg",
    description: "Una mirada cercana a la vida de Jesús, desde su nacimiento hasta su ascensión, que combina el relato bíblico con reflexiones devocionales. Uno de los libros más leídos de Elena G. White, en una edición manejable en tapa blanda tamaño A5.",
  },
  "historia-de-los-patriarcas-y-profetas": {
    title: "Historia de los Patriarcas y Profetas",
    format: "Edición tapa dura",
    price: 25.20,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/historia-de-los-patriarcas-y-profetas.jpg",
    description: "Repasa los grandes relatos del Antiguo Testamento, desde la creación hasta el rey David, iluminando el carácter de Dios a través de la vida de los patriarcas y los primeros profetas. Edición en tapa dura, pensada para durar en tu biblioteca.",
  },
  "profetas-y-reyes": {
    title: "Profetas y Reyes",
    format: "Edición tapa blanda",
    price: 10.83,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/profetas-y-reyes.jpg",
    description: "Continúa el relato bíblico a través de los reinos de Israel y Judá, la obra de Elías, Eliseo, Isaías y los profetas mayores, hasta el regreso del cautiverio babilónico. Una edición cuidada en tapa blanda, ideal para el estudio diario.",
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

// ==========================================================================
// "productoMeta" — sirve la ficha de producto (URL pública /producto.html)
//
// La página real vive en el archivo estático "producto-app.html". Esta
// función la lee, sustituye los bloques de metadatos (title, description,
// og:*, twitter:*, canonical) por los datos reales del libro pedido en
// ?id=, añade su JSON-LD (Product + BreadcrumbList) y devuelve el HTML ya
// completo. Así, cuando alguien comparte un enlace de un libro por
// WhatsApp, Facebook o Twitter, esas apps ven directamente el título, la
// portada y el resumen del libro — no tienen que ejecutar JavaScript para
// enterarse (cosa que la mayoría de esas apps no hace).
//
// El archivo firebase.json redirige internamente /producto.html hacia esta
// función (ver "rewrites"), así que para el visitante la URL sigue siendo
// siempre la misma: /producto.html?id=el-id-del-libro
//
// 👉 Si cambias el DISEÑO o la ESTRUCTURA de producto-app.html (añadir
// secciones, cambiar el <head>, etc.), no hace falta tocar nada aquí: esta
// función solo reemplaza el contenido de las etiquetas con id="..." que ya
// existen, así que sigue funcionando igual. Solo tendrías que avisarme si
// alguna vez cambias o quitas esos id (pageTitle, metaDescription,
// canonicalLink, ogTitle, ogDescription, ogUrl, ogImage, twitterTitle,
// twitterDescription, twitterImage).
// ==========================================================================
const SITE_URL = "https://www.libreriatumayortesoro.com";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

exports.productoMeta = onRequest(async (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const libro = CATALOGO[id];

  let html;
  try {
    const respuesta = await fetch(SITE_URL + "/producto-app.html");
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    html = await respuesta.text();
  } catch (err) {
    // Si por lo que sea la plantilla no se puede leer, no dejamos a la
    // persona colgada: la mandamos directa a la página real.
    res.redirect(302, "/producto-app.html" + (id ? "?id=" + encodeURIComponent(id) : ""));
    return;
  }

  if (libro) {
    const pageTitle = libro.title + " — Librería tu mayor tesoro";
    const desc = libro.description.slice(0, 155);
    const url = SITE_URL + "/producto.html?id=" + id;
    const image = SITE_URL + "/" + libro.cover;

    html = html
      .replace(/(<title id="pageTitle">)[^<]*(<\/title>)/, "$1" + escapeHtml(pageTitle) + "$2")
      .replace(/(id="metaDescription"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(desc) + "$2")
      .replace(/(id="canonicalLink"[^>]*href=")[^"]*(")/, "$1" + url + "$2")
      .replace(/(id="ogTitle"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(pageTitle) + "$2")
      .replace(/(id="ogDescription"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(desc) + "$2")
      .replace(/(id="ogUrl"[^>]*content=")[^"]*(")/, "$1" + url + "$2")
      .replace(/(id="ogImage"[^>]*content=")[^"]*(")/, "$1" + image + "$2")
      .replace(/(id="twitterTitle"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(pageTitle) + "$2")
      .replace(/(id="twitterDescription"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(desc) + "$2")
      .replace(/(id="twitterImage"[^>]*content=")[^"]*(")/, "$1" + image + "$2");

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: libro.title,
      image: image,
      description: libro.description,
      brand: { "@type": "Brand", name: libro.author },
      offers: {
        "@type": "Offer",
        url: url,
        priceCurrency: "EUR",
        price: String(libro.price),
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "Librería tu mayor tesoro" },
      },
    };
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: libro.categoryLabel, item: SITE_URL + "/categoria.html?cat=" + libro.category },
        { "@type": "ListItem", position: 3, name: libro.title, item: url },
      ],
    };
    const bloqueJsonLd =
      '<script type="application/ld+json">' + JSON.stringify(jsonLd) + "</script>\n" +
      '<script type="application/ld+json">' + JSON.stringify(breadcrumbLd) + "</script>\n</head>";
    html = html.replace("</head>", bloqueJsonLd);
  }

  res.set("Content-Type", "text/html; charset=UTF-8");
  // Se cachea un rato: así, si un libro se comparte muchas veces seguidas,
  // no hace falta volver a generar la página cada vez.
  res.set("Cache-Control", "public, max-age=600, s-maxage=3600");
  res.status(200).send(html);
});
