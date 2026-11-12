// ==========================================================================
// Envíos por país y nº de libros — SERVIDOR
// COPIA de js/shipping.js (MISMOS NÚMEROS). Esta es la que de verdad decide
// cuánto se cobra en "crearPedido": nunca nos fiamos del precio del navegador.
//
// Precio al cliente = coste del proveedor + 2 € de margen, redondeado hacia
// arriba al euro entero (España 1-2 libros: 5,91 + 2 = 7,91 → 8 €). Reino
// Unido: el proveedor cobra en libras y se pasa a euros con TASA_GBP_EUR.
// Si cambian las tarifas, actualiza ESTE archivo Y js/shipping.js a la vez.
// ==========================================================================
'use strict';
var MARGEN_EUR = 2;
  var TASA_GBP_EUR = 1.17;

  // Tramos de ejemplares (el último no tiene tope).
  var TRAMOS = [
    { min: 1,   max: 2,        etiqueta: '1 - 2' },
    { min: 3,   max: 9,        etiqueta: '3 - 9' },
    { min: 10,  max: 49,       etiqueta: '10 - 49' },
    { min: 50,  max: 99,       etiqueta: '50 - 99' },
    { min: 100, max: 249,      etiqueta: '100 - 249' },
    { min: 250, max: 499,      etiqueta: '250 - 499' },
    { min: 500, max: Infinity, etiqueta: '500 +' }
  ];

  // coste = lo que te cobra el proveedor por tramo (en la moneda indicada).
  var PAISES = {
    ES: { nombre: 'España',       moneda: 'EUR', coste: [5.91, 5.59, 5.01, 4.48, 4.08, 3.73, 3.73], cp: 'ES' },
    PT: { nombre: 'Portugal',     moneda: 'EUR', coste: [5.91, 5.59, 5.01, 4.48, 4.08, 3.73, 3.73], cp: 'PT' },
    FR: { nombre: 'Francia',      moneda: 'EUR', coste: [7.72, 7.12, 6.78, 6.51, 6.25, 6.00, 5.50], cp: 'FR' },
    DE: { nombre: 'Alemania',     moneda: 'EUR', coste: [7.42, 6.43, 5.99, 5.82, 5.72, 5.71, 5.71], cp: 'DE' },
    NL: { nombre: 'Países Bajos', moneda: 'EUR', coste: [8.89, 8.52, 8.21, 7.30, 6.18, 5.07, 4.33], cp: 'NL' },
    GB: { nombre: 'Reino Unido',  moneda: 'GBP', coste: [7.50, 6.85, 6.32, 6.04, 5.79, 5.55, 5.55], cp: 'GB' }
  };
  var ORDEN = ['ES', 'PT', 'FR', 'DE', 'NL', 'GB'];
  var PAIS_POR_DEFECTO = 'ES';

  function redondea2(n) { return Math.round(n * 100) / 100; }

  function precioTramo(pais, i) {
    var p = PAISES[pais];
    if (!p) return null;
    var coste = p.coste[i] * (p.moneda === 'GBP' ? TASA_GBP_EUR : 1);
    return Math.ceil(redondea2(coste + MARGEN_EUR) - 1e-9);
  }

  function indiceTramo(numLibros) {
    var n = Math.max(1, Math.floor(Number(numLibros) || 1));
    for (var i = 0; i < TRAMOS.length; i++) {
      if (n >= TRAMOS[i].min && n <= TRAMOS[i].max) return i;
    }
    return TRAMOS.length - 1;
  }

  // Gastos de envío (€) de un pedido con "numLibros" libros enviado a "pais".
  function costeEnvio(pais, numLibros) {
    if (!PAISES[pais]) pais = PAIS_POR_DEFECTO;
    return precioTramo(pais, indiceTramo(numLibros));
  }

  // ---- Códigos postales ---------------------------------------------------
  // Devuelve el código postal normalizado, o null si no es válido.
  function normalizarCP(pais, cp) {
    var s = String(cp == null ? '' : cp).trim().toUpperCase();
    var m;
    switch (pais) {
      case 'ES':
      case 'FR':
      case 'DE':
        s = s.replace(/\s+/g, '');
        return /^\d{5}$/.test(s) ? s : null;
      case 'PT':
        s = s.replace(/\s+/g, '');
        m = /^(\d{4})-?(\d{3})$/.exec(s);
        return m ? m[1] + '-' + m[2] : null;
      case 'NL':
        m = /^(\d{4})\s?([A-Z]{2})$/.exec(s);
        return m ? m[1] + ' ' + m[2] : null;
      case 'GB':
        s = s.replace(/\s+/g, '');
        m = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/.exec(s);
        return m ? m[1] + ' ' + m[2] : null;
      default:
        return null;
    }
  }

  var AYUDA_CP = {
    ES: { placeholder: '03001', mensaje: 'El código postal no es válido (5 cifras).' },
    PT: { placeholder: '1000-001', mensaje: 'El código postal no es válido (formato 0000-000).' },
    FR: { placeholder: '75001', mensaje: 'El código postal no es válido (5 cifras).' },
    DE: { placeholder: '10115', mensaje: 'El código postal no es válido (5 cifras).' },
    NL: { placeholder: '1012 AB', mensaje: 'El código postal no es válido (formato 1234 AB).' },
    GB: { placeholder: 'SW1A 1AA', mensaje: 'El código postal no es válido (por ejemplo SW1A 1AA).' }
  };

  // Mensaje de error si el CP no sirve para ese país (o "" si está bien).
  function errorCP(pais, cp) {
    var norm = normalizarCP(pais, cp);
    if (!norm) return (AYUDA_CP[pais] || AYUDA_CP.ES).mensaje;
    if (pais === 'ES') {
      var prov = Number(norm.slice(0, 2));
      if (prov < 1 || prov > 52) return AYUDA_CP.ES.mensaje;
      if (['35', '38', '51', '52'].indexOf(norm.slice(0, 2)) !== -1) {
        return 'Para España solo enviamos a la península y Baleares. Escríbenos a libreriamayortesoro@gmail.com y lo miramos.';
      }
    }
    return '';
  }

  module.exports = {
    MARGEN_EUR: MARGEN_EUR,
    TASA_GBP_EUR: TASA_GBP_EUR,
    TRAMOS: TRAMOS,
    PAISES: PAISES,
    ORDEN: ORDEN,
    PAIS_POR_DEFECTO: PAIS_POR_DEFECTO,
    AYUDA_CP: AYUDA_CP,
    precioTramo: precioTramo,
    indiceTramo: indiceTramo,
    costeEnvio: costeEnvio,
    normalizarCP: normalizarCP,
    errorCP: errorCP
  };
