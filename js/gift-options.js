// ==========================================================================
// "Regala con propósito" — extras de regalo y cuidado del libro
// --------------------------------------------------------------------------
// Aquí viven, EN UN SOLO SITIO, los extras que el cliente puede añadir a
// cualquier libro desde su ficha: envoltorio de regalo, tarjeta con
// dedicatoria, exlibris personalizado y funda de tela.
//
// 👉 PARA CAMBIAR UN PRECIO o un texto, edita solo este archivo... y su
// copia del servidor (constante EXTRAS_REGALO en functions/index.js), que
// es la que de verdad se cobra. Son dos copias a propósito: una para
// pintar la ficha al instante y otra para que el importe no dependa de lo
// que mande el navegador.
//
// Campos de cada extra:
//   slug      → identificador interno (viaja al pedido)
//   label     → nombre que ve el cliente
//   desc      → una línea explicando qué es
//   price     → precio en euros (0 = incluido gratis)
//   perUnit   → true: se cobra por ejemplar; false: una vez por libro
//   input     → 'texto' si necesita que el cliente escriba algo
//   maxLength → límite de caracteres de ese texto
// ==========================================================================
window.GIFT_EXTRAS = [
  {
    slug: 'envoltorio',
    label: 'Envoltorio de regalo',
    desc: 'Papel kraft de calidad, lazo de algodón y sello de la librería. Preparado a mano.',
    price: 3.50,
    perUnit: true
  },
  {
    slug: 'dedicatoria',
    label: 'Tarjeta con dedicatoria',
    desc: 'Escribe tu mensaje y lo imprimimos en una tarjeta de papel verjurado. Sin coste.',
    price: 0,
    perUnit: false,
    input: 'texto',
    placeholder: 'Ej.: «Para Marta, en el día de tu bautismo. Con todo nuestro cariño.»',
    maxLength: 300
  },
  {
    slug: 'exlibris',
    label: 'Exlibris personalizado',
    desc: 'Etiqueta elegante para la primera página, con el nombre de quien recibe el libro.',
    price: 2.90,
    perUnit: true,
    input: 'texto',
    placeholder: 'Nombre que aparecerá en el exlibris',
    maxLength: 60
  },
  {
    slug: 'funda',
    label: 'Funda de tela para el libro',
    desc: 'Cubierta protectora de algodón, cosida a mano, en tono sobrio. Ideal para llevarlo cada día.',
    price: 9.90,
    perUnit: true
  }
];

window.GIFT_BY_SLUG = {};
window.GIFT_EXTRAS.forEach(function (g) { window.GIFT_BY_SLUG[g.slug] = g; });

// ---- Utilidades ----------------------------------------------------------
// "regalo" es el objeto que se guarda en cada línea del carrito, p. ej.:
//   { envoltorio: true, dedicatoria: 'Para Marta…', exlibris: 'Marta', funda: false }

// Lista de extras activos de una línea del carrito, ya con su importe.
window.giftExtrasFor = function (item) {
  var regalo = item && item.regalo;
  if (!regalo) return [];
  var qty = Math.max(1, item.qty || 1);
  return window.GIFT_EXTRAS.filter(function (g) {
    var v = regalo[g.slug];
    return g.input === 'texto' ? !!(v && String(v).trim()) : !!v;
  }).map(function (g) {
    var unidades = g.perUnit ? qty : 1;
    return {
      slug: g.slug,
      label: g.label,
      texto: g.input === 'texto' ? String(regalo[g.slug]).trim() : '',
      unidades: unidades,
      price: g.price,
      total: Math.round(g.price * unidades * 100) / 100
    };
  });
};

// Suma de todos los extras de regalo del carrito.
window.giftExtrasTotal = function (items) {
  return (items || []).reduce(function (sum, item) {
    return sum + window.giftExtrasFor(item).reduce(function (s, e) { return s + e.total; }, 0);
  }, 0);
};

// Clave corta que distingue dos líneas del MISMO libro con regalos
// distintos (así se pueden pedir dos ejemplares, uno envuelto y otro no).
window.giftKey = function (regalo) {
  if (!regalo) return '';
  return window.GIFT_EXTRAS.map(function (g) {
    var v = regalo[g.slug];
    if (!v) return '';
    return g.input === 'texto' ? g.slug + ':' + String(v).trim().slice(0, 40) : g.slug;
  }).filter(Boolean).join('|');
};

// Resumen en una línea, para el carrito y los correos.
window.giftSummary = function (regalo) {
  var fake = { regalo: regalo, qty: 1 };
  var extras = window.giftExtrasFor(fake);
  if (!extras.length) return '';
  return extras.map(function (e) {
    return e.texto ? e.label + ' («' + e.texto + '»)' : e.label;
  }).join(' · ');
};
