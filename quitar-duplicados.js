// ============================================================================
// quitar-duplicados.js  —  ejecútalo UNA vez desde la raíz del proyecto:
//
//     node quitar-duplicados.js
//
// Qué hace (y por qué):
//   Dos libros estaban dados de alta DOS veces, porque la portada "clásica"
//   se añadió como producto aparte en vez de como una portada más del libro:
//
//   · Consejos sobre la Mayordomía Cristiana
//       se queda:  consejos-sobre-la-mayordomia-cristiana   (9,01 €)
//       se elimina: consejos-sobre-mayordomia-cristiana     (8,11 €)
//   · Consejos sobre la Obra de Escuela Sabática
//       se queda:  consejos-sobre-la-obra-de-escuela-sabatica   (8,19 €)
//       se elimina: consejos-sobre-la-obra-de-la-escuela-sabatica (7,24 €)
//
//   Se conservan las fichas antiguas porque son las que tienen su tabla de
//   precios en js/ew-pricing.js (configurador de tapa/tamaño/papel). La
//   portada clásica pasa a ser una portada más (array "covers") de esa ficha.
//
// Archivos que toca (con copia de seguridad .bak-duplicados al lado):
//   js/books-data.js · functions/index.js · sitemap.xml · js/ew-pricing.js
// Los enlaces antiguos a las fichas eliminadas redirigen a la ficha que queda
// (usa el mecanismo EW_MERGED_REDIRECTS que ya tenías).
// Es seguro ejecutarlo dos veces: la segunda vez no hace nada.
// Después de comprobar la web puedes borrar este archivo y los .bak-duplicados.
// ============================================================================
const fs = require('fs');
const path = require('path');

const R = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const W = (f, t) => fs.writeFileSync(path.join(__dirname, f), t);
const backup = (f) => {
  const b = path.join(__dirname, f + '.bak-duplicados');
  if (!fs.existsSync(b)) fs.copyFileSync(path.join(__dirname, f), b);
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Pares: id que se elimina → ficha que se queda
const PARES = [
  {
    quitar: 'consejos-sobre-mayordomia-cristiana',
    queda: 'consejos-sobre-la-mayordomia-cristiana',
    clasica: 'img/consejos-sobre-mayordomia-cristiana-clasica.jpg',
    subcategory: "['mayordomia', 'vida-cristiana']",
    needs: "['servir-y-compartir', 'crecer-cada-dia']"
  },
  {
    quitar: 'consejos-sobre-la-obra-de-la-escuela-sabatica',
    queda: 'consejos-sobre-la-obra-de-escuela-sabatica',
    clasica: 'img/consejos-sobre-la-obra-de-la-escuela-sabatica-clasica.jpg',
    subcategory: null, // se mantiene la que tenía
    needs: null
  }
];

let cambios = 0;
function paso(msg) { cambios++; console.log('  ✔ ' + msg); }

// ---------------------------------------------------------------- books-data
let bd = R('js/books-data.js');
const bd0 = bd;
PARES.forEach((p) => {
  // 1) borrar la ficha duplicada entera
  const reBloque = new RegExp("  \\{\\n    id: '" + esc(p.quitar) + "',[\\s\\S]*?\\n  \\},\\n");
  if (reBloque.test(bd)) { bd = bd.replace(reBloque, ''); paso('books-data.js: eliminada la ficha ' + p.quitar); }

  // 2) añadir la portada clásica a la ficha que se queda (si no la tiene)
  const reIni = new RegExp("  \\{\\n    id: '" + esc(p.queda) + "',[\\s\\S]*?\\n  \\},\\n");
  const m = bd.match(reIni);
  if (!m) throw new Error('No encuentro la ficha ' + p.queda + ' en js/books-data.js');
  let bloque = m[0];
  if (bloque.indexOf("style: 'clasica'") === -1) {
    // Orden que exige verificar-catalogo.js: ilustrada, tip. clara, tip. oscura, clásica
    const re = new RegExp("(      \\{ style: 'tipografica-oscura', file: '[^']*' \\})\\n    \\],");
    if (!re.test(bloque)) throw new Error('Formato inesperado de covers en ' + p.queda);
    bloque = bloque.replace(re, "$1,\n      { style: 'clasica', file: '" + p.clasica + "' }\n    ],");
    paso('books-data.js: portada clásica añadida a ' + p.queda);
  }
  if (p.subcategory) {
    bloque = bloque.replace(/    subcategory: \[[^\]]*\],\n/, '    subcategory: ' + p.subcategory + ',\n');
  }
  bd = bd.replace(m[0], bloque);

  // 3) BOOK_NEEDS: quitar la línea del duplicado y unir los "needs"
  const reNeedQuitar = new RegExp("  '" + esc(p.quitar) + "': \\[[^\\]]*\\],\\n");
  if (reNeedQuitar.test(bd)) { bd = bd.replace(reNeedQuitar, ''); paso('books-data.js: quitado de BOOK_NEEDS ' + p.quitar); }
  if (p.needs) {
    const reNeedQueda = new RegExp("(  '" + esc(p.queda) + "': )\\[[^\\]]*\\](,\\n)");
    bd = bd.replace(reNeedQueda, '$1' + p.needs + '$2');
  }
});
if (bd !== bd0) { backup('js/books-data.js'); W('js/books-data.js', bd); }

// ------------------------------------------------------------ functions/index
let fx = R('functions/index.js');
const fx0 = fx;
PARES.forEach((p) => {
  const re = new RegExp('  "' + esc(p.quitar) + '": \\{[\\s\\S]*?\\n  \\},\\n');
  if (re.test(fx)) { fx = fx.replace(re, ''); paso('functions/index.js: eliminada ' + p.quitar + ' del catálogo del servidor'); }
});
if (fx !== fx0) { backup('functions/index.js'); W('functions/index.js', fx); }

// ------------------------------------------------------------------- sitemap
let sm = R('sitemap.xml');
const sm0 = sm;
PARES.forEach((p) => {
  const re = new RegExp('  <url><loc>[^<]*producto\\.html\\?id=' + esc(p.quitar) + '</loc>[^\\n]*\\n');
  if (re.test(sm)) { sm = sm.replace(re, ''); paso('sitemap.xml: quitada la URL de ' + p.quitar); }
});
if (sm !== sm0) { backup('sitemap.xml'); W('sitemap.xml', sm); }

// -------------------------------------------------- redirecciones (enlaces viejos)
let ew = R('js/ew-pricing.js');
const ew0 = ew;
PARES.forEach((p) => {
  if (ew.indexOf("'" + p.quitar + "':") !== -1) return;
  const ancla = "window.EW_MERGED_REDIRECTS = {\n";
  if (ew.indexOf(ancla) === -1) throw new Error('No encuentro EW_MERGED_REDIRECTS en js/ew-pricing.js');
  ew = ew.replace(ancla, ancla + "  '" + p.quitar + "': { id: '" + p.queda + "', tipo: 'blanda' },\n");
  paso('ew-pricing.js: redirección ' + p.quitar + ' → ' + p.queda);
});
if (ew !== ew0) { backup('js/ew-pricing.js'); W('js/ew-pricing.js', ew); }

console.log(cambios ? '\nListo: ' + cambios + ' cambios. Ahora ejecuta:  node verificar-catalogo.js' : '\nNada que hacer: los duplicados ya estaban quitados.');
