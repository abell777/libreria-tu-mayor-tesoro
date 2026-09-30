// ============================================================================
// verificar-catalogo.js — se ejecuta SOLO antes de cada «firebase deploy»
// (está enlazado en firebase.json → "predeploy"). No tienes que acordarte.
//
// 1) SINCRONIZA: si has añadido un libro nuevo a js/books-data.js, lo copia
//    él mismo al catálogo del servidor (functions/index.js); y si has cambiado
//    el precio de un libro de precio fijo, actualiza también el del servidor.
// 2) COMPRUEBA que web y servidor coinciden (precios, portadas, envío...).
//    Si encuentra algo que no puede arreglar solo, PARA el despliegue y
//    explica qué pasa. Si todo va bien, el despliegue continúa.
// También puedes ejecutarlo a mano:  node verificar-catalogo.js
// ============================================================================
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
global.window = {};
eval(R('js/ew-pricing.js')); eval(R('js/books-data.js'));
const server = require('./functions/ew-pricing.js');

// ---- 1) Sincronización automática web → servidor ---------------------------
function sincronizar() {
  const fsx = require('fs'); const f = path.join(__dirname, 'functions/index.js');
  let txt = fsx.readFileSync(f, 'utf8'); const hechos = [];
  const cuerpo = () => txt.slice(txt.indexOf('const CATALOGO = {'));
  const tiene = (id) => new RegExp('^  "' + id.replace(/[-]/g, '\\-') + '": \\{', 'm').test(cuerpo());
  const nuevos = [];
  window.BOOKS.forEach((b) => {
    if (nuevos.indexOf(b.id) !== -1) return;
    if (!tiene(b.id)) {
      const e = { title: b.title, format: b.format || '', price: b.price, author: b.author || '', category: b.category || '', categoryLabel: b.categoryLabel || '', cover: b.cover || '', description: b.description || '' };
      if (b.freeShipping) e.freeShipping = true;
      const bloque = '  ' + JSON.stringify(b.id) + ': ' + JSON.stringify(e, null, 4).replace(/\n/g, '\n  ') + ',\n';
      txt = txt.replace('const CATALOGO = {\n', 'const CATALOGO = {\n' + bloque);
      nuevos.push(b.id); hechos.push('Libro nuevo añadido al servidor: ' + b.id);
    } else if (!window.hasEWPrintOptions(b.id)) {
      const ini = txt.indexOf('\n  "' + b.id + '": {'); const fin = txt.indexOf('\n  },', ini);
      const trozo = txt.slice(ini, fin); const m = trozo.match(/"?price"?: ([\d.]+),/);
      if (m && Math.abs(parseFloat(m[1]) - b.price) > 0.005) {
        txt = txt.slice(0, ini) + trozo.replace(/("?price"?: )[\d.]+,/, '$1' + b.price + ',') + txt.slice(fin);
        hechos.push('Precio actualizado en el servidor: ' + b.id + ' (' + m[1] + ' → ' + b.price + ')');
      }
    }
  });
  if (hechos.length) fsx.writeFileSync(f, txt);
  return hechos;
}
const hechos = sincronizar();
hechos.forEach((h) => console.log('SINCRONIZADO: ' + h));

const src = R('functions/index.js');

const i0 = src.indexOf('const CATALOGO = {'); let d = 0, j = src.indexOf('{', i0), end = j;
for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; if (src[k] === '}') { d--; if (d === 0) { end = k + 1; break; } } }
const CAT = eval('(' + src.slice(j, end) + ')');
const pv = src.match(/PORTADAS_VALIDAS = \{([\s\S]*?)\};/)[1];
const validas = [...pv.matchAll(/"?([a-z-]+)"?\s*:/g)].map((m) => m[1]);

const errores = [], avisos = [];
const B = window.BOOKS;
const vistos = {}; B.forEach((b) => { vistos[b.id] = (vistos[b.id] || 0) + 1; });
Object.entries(vistos).filter((x) => x[1] > 1).forEach((x) => avisos.push('ID repetido en books-data.js (se usa solo el primero): ' + x[0]));

B.forEach((b) => {
  const c = CAT[b.id];
  if (!c) { errores.push('«' + b.id + '» está en la web pero NO en CATALOGO (functions/index.js): el pedido fallaría.'); return; }
  const ew = window.hasEWPrintOptions(b.id);
  if (!ew && Math.abs(c.price - b.price) > 0.005) errores.push('«' + b.id + '»: precio web ' + b.price + ' ≠ servidor ' + c.price);
  if (!!b.freeShipping !== !!c.freeShipping) errores.push('«' + b.id + '»: envío gratis distinto entre web y servidor.');
  if (ew) {
    const dft = window.EW_BOOK_DEFAULTS[b.id];
    const p = window.getEWPrice(b.id, dft.tipo, dft.tamano, dft.acabado, dft.papel);
    if (Math.abs(p - b.price) > 0.005) avisos.push('«' + b.id + '»: en la ficha se cobra ' + p + ' € por defecto, pero la tarjeta muestra ' + b.price + ' €.');
  }
  window.bookCovers(b).forEach((cv) => {
    if (!validas.includes(cv.style)) errores.push('«' + b.id + '»: la portada "' + cv.style + '" no está en PORTADAS_VALIDAS del servidor.');
  });
});

// Cliente y servidor deben dar el mismo precio en TODAS las combinaciones.
let comb = 0;
B.filter((b) => window.hasEWPrintOptions(b.id)).forEach((b) => {
  ['blanda', 'dura'].forEach((t) => (window.EW_SIZES_BY_TIPO[t] || []).forEach((z) => ['mate', 'brillo'].forEach((a) => ['offset', 'crema', 'semi'].forEach((p) => {
    comb++;
    const x = window.getEWPrice(b.id, t, z.slug, a, p), y = server.getEWPrice(b.id, t, z.slug, a, p);
    if (x !== y) errores.push('«' + b.id + '» ' + [t, z.slug, a, p].join('/') + ': navegador ' + x + ' ≠ servidor ' + y);
  }))));
});
(window.EW_COLLECTIONS ? Object.keys(window.EW_COLLECTIONS) : []).forEach((id) => {
  if (!server.hasEWPrintOptions(id)) errores.push('La colección «' + id + '» no está configurada en el servidor (functions/ew-pricing.js).');
});

console.log('Libros revisados: ' + B.length + ' | combinaciones de precio comparadas: ' + comb);
avisos.forEach((a) => console.log('AVISO: ' + a));
if (errores.length) { errores.forEach((e) => console.log('ERROR: ' + e)); console.log('\n' + errores.length + ' ERROR(ES). No despliegues todavía.'); process.exit(1); }
console.log('\nTODO CORRECTO: web y servidor están de acuerdo.');
