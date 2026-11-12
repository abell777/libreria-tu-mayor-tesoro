// ==========================================================================
// Tarifas de envío por país y nº de ejemplares — Librería tu mayor tesoro
//
// 👉 ESTE ARCHIVO ES IDÉNTICO EN DOS SITIOS (js/shipping-rates.js para la web
//    y functions/shipping-rates.js para el servidor). Si cambias algo, cámbialo
//    en los dos (copia y pega el archivo entero). «node verificar-catalogo.js»
//    —que se ejecuta solo antes de cada «firebase deploy»— PARA el despliegue
//    si no son idénticos.
//
// Cómo se calcula lo que paga el cliente:
//    precio al cliente = lo que te cuesta a ti (tabla COSTES) + RECARGO (1,10 €)
//    Sin redondeos a números "bonitos": justo tu coste + 1,10 €.
//
// Los costes son los de tu tabla del transportista, por tramo de ejemplares
// (cada colección cuenta como los libros que lleva; los extras de regalo no).
// El Reino Unido te lo cobran en LIBRAS: se pasa a euros con TASA_GBP_EUR
// (mira «TASA_GBP_EUR» abajo) y luego se suma el recargo en euros.
// ==========================================================================
(function (root) {
  'use strict';

  var RECARGO = 1.10;       // € que se suman a tu coste (exactos)
  var TASA_GBP_EUR = 1.20;  // 1 £ = 1,20 € → revísala de vez en cuando (solo afecta al Reino Unido)

  // Tramos de ejemplares: "hasta" es el máximo de cada tramo.
  var TRAMOS = [
    { hasta: 2,        etiqueta: '1 – 2' },
    { hasta: 9,        etiqueta: '3 – 9' },
    { hasta: 49,       etiqueta: '10 – 49' },
    { hasta: 99,       etiqueta: '50 – 99' },
    { hasta: 249,      etiqueta: '100 – 249' },
    { hasta: 499,      etiqueta: '250 – 499' },
    { hasta: Infinity, etiqueta: '500 +' }
  ];

  // Lo que te cuesta a ti, por país y tramo (mismo orden que TRAMOS).
  var PAISES = {
    ES: { nombre: 'España',       moneda: 'EUR', costes: [5.91, 5.59, 5.01, 4.48, 4.08, 3.73, 3.73] },
    PT: { nombre: 'Portugal',     moneda: 'EUR', costes: [5.91, 5.59, 5.01, 4.48, 4.08, 3.73, 3.73] },
    FR: { nombre: 'Francia',      moneda: 'EUR', costes: [7.72, 7.12, 6.78, 6.51, 6.25, 6.00, 5.50] },
    DE: { nombre: 'Alemania',     moneda: 'EUR', costes: [7.42, 6.43, 5.99, 5.82, 5.72, 5.71, 5.71] },
    NL: { nombre: 'Países Bajos', moneda: 'EUR', costes: [8.89, 8.52, 8.21, 7.30, 6.18, 5.07, 4.33] },
    GB: { nombre: 'Reino Unido',  moneda: 'GBP', costes: [7.50, 6.85, 6.32, 6.04, 5.79, 5.55, 5.55] }
  };
  var ORDEN = ['ES', 'PT', 'FR', 'DE', 'NL', 'GB'];

  function indiceTramo(numLibros) {
    var n = Math.max(1, Math.floor(Number(numLibros) || 1));
    for (var i = 0; i < TRAMOS.length; i++) if (n <= TRAMOS[i].hasta) return i;
    return TRAMOS.length - 1;
  }

  // Céntimos que paga el cliente (número entero → sin errores de decimales).
  function centimosTramo(pais, i) {
    var p = PAISES[pais];
    if (!p) return null;
    var coste = p.costes[i];
    var centimosCoste = p.moneda === 'GBP' ? Math.round(coste * 100 * TASA_GBP_EUR) : Math.round(coste * 100);
    return centimosCoste + Math.round(RECARGO * 100);
  }

  // Euros de envío para un país y un nº de ejemplares.
  function costeEnvio(pais, numLibros) {
    var c = centimosTramo(pais, indiceTramo(numLibros));
    return c === null ? null : c / 100;
  }

  function paisValido(pais) { return Object.prototype.hasOwnProperty.call(PAISES, pais); }

  // Valida y normaliza el código postal de cada país.
  // Devuelve { ok: true, cp: '...' } o { ok: false, mensaje: '...' }.
  function validarCP(pais, cpBruto) {
    var cp = String(cpBruto == null ? '' : cpBruto).trim();
    var m;
    switch (pais) {
      case 'ES':
        cp = cp.replace(/\s+/g, '');
        if (!/^\d{5}$/.test(cp) || Number(cp.slice(0, 2)) < 1 || Number(cp.slice(0, 2)) > 52) {
          return { ok: false, mensaje: 'El código postal no es válido (5 cifras).' };
        }
        if (['35', '38', '51', '52'].indexOf(cp.slice(0, 2)) !== -1) {
          return { ok: false, mensaje: 'Ahora mismo solo enviamos a la península y Baleares. Escríbenos a libreriamayortesoro@gmail.com y lo miramos.' };
        }
        return { ok: true, cp: cp };
      case 'PT':
        m = cp.replace(/\s+/g, '').match(/^(\d{4})-?(\d{3})$/);
        if (!m) return { ok: false, mensaje: 'El código postal de Portugal no es válido (formato 1234-567).' };
        if (m[1].charAt(0) === '9') {
          return { ok: false, mensaje: 'Ahora mismo solo enviamos a Portugal continental (no a Azores ni Madeira). Escríbenos a libreriamayortesoro@gmail.com y lo miramos.' };
        }
        return { ok: true, cp: m[1] + '-' + m[2] };
      case 'FR':
        cp = cp.replace(/\s+/g, '');
        if (!/^\d{5}$/.test(cp) || Number(cp.slice(0, 2)) < 1 || Number(cp.slice(0, 2)) > 98) {
          return { ok: false, mensaje: 'El código postal de Francia no es válido (5 cifras).' };
        }
        if (Number(cp.slice(0, 2)) > 95) {
          return { ok: false, mensaje: 'Ahora mismo solo enviamos a Francia metropolitana. Escríbenos a libreriamayortesoro@gmail.com y lo miramos.' };
        }
        return { ok: true, cp: cp };
      case 'DE':
        cp = cp.replace(/\s+/g, '');
        if (!/^\d{5}$/.test(cp)) return { ok: false, mensaje: 'El código postal de Alemania no es válido (5 cifras).' };
        return { ok: true, cp: cp };
      case 'NL':
        m = cp.replace(/\s+/g, '').match(/^(\d{4})([A-Za-z]{2})$/);
        if (!m) return { ok: false, mensaje: 'El código postal de Países Bajos no es válido (formato 1234 AB).' };
        return { ok: true, cp: m[1] + ' ' + m[2].toUpperCase() };
      case 'GB':
        m = cp.replace(/\s+/g, '').toUpperCase().match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
        if (!m) return { ok: false, mensaje: 'El código postal del Reino Unido no es válido (por ejemplo SW1A 1AA).' };
        if (/^(GY|JE|IM)/.test(m[1])) {
          return { ok: false, mensaje: 'Ahora mismo no enviamos a las Islas del Canal ni a la Isla de Man. Escríbenos a libreriamayortesoro@gmail.com y lo miramos.' };
        }
        return { ok: true, cp: m[1] + ' ' + m[2] };
      default:
        return { ok: false, mensaje: 'País de envío no válido.' };
    }
  }

  var API = {
    RECARGO: RECARGO,
    TASA_GBP_EUR: TASA_GBP_EUR,
    TRAMOS: TRAMOS,
    PAISES: PAISES,
    ORDEN: ORDEN,
    indiceTramo: indiceTramo,
    centimosTramo: centimosTramo,
    costeEnvio: costeEnvio,
    paisValido: paisValido,
    validarCP: validarCP
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ShippingRates = API;
})(typeof window !== 'undefined' ? window : this);
