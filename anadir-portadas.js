// ============================================================================
// anadir-portadas.js — añade las portadas «clásica» que faltaban a sus libros.
// Ejecutar desde la raíz del proyecto:   node anadir-portadas.js
// (con la carpeta «portadas-clasicas» al lado de js/ e img/).
//  · Declara la portada «clasica» en js/books-data.js, al final del array
//    «covers» del libro (orden correcto: ilustrada, clara, oscura, clásica).
//  · Copia los .jpg y .webp a img/. Si un fichero ya existe NO lo pisa;
//    para sustituirlo por el nuevo:  node anadir-portadas.js --sobrescribir
// Es seguro repetirlo.
// ============================================================================
const fs = require('fs'), path = require('path');
const SOBRE = process.argv.includes('--sobrescribir');
const LIBROS = {
  'el-conflicto-de-los-siglos': 'el-conflicto-de-los-siglos-clasica',
  'el-conflicto-inminente': 'el-conflicto-inminente-clasica',
  'el-evangelismo': 'el-evangelismo-clasica',
  'el-ministerio-de-curacion': 'el-ministerio-de-curacion-clasica',
  'el-ministerio-de-publicaciones': 'el-ministerio-de-publicaciones-clasica',
  'el-ministerio-pastoral': 'el-ministerio-pastoral-clasica',
  'el-otro-poder': 'el-otro-poder-clasica',
  'en-los-lugares-celestiales': 'en-los-lugares-celestiales-clasica',
  'eventos-de-los-ultimos-dias': 'eventos-de-los-ultimos-dias-clasica',
  'exaltad-a-jesus': 'exaltad-a-jesus-clasica',
  'fe-y-obras': 'fe-y-obras-clasica',
  'hijas-de-dios': 'hijas-de-dios-clasica',
  'hijos-e-hijas-de-dios': 'hijos-e-hijas-de-dios-clasica',
  'a-fin-de-conocerle': 'a-fin-de-conocerle-clasica',
  'coleccion-kress': 'coleccion-kress-clasica',
  'maranatha-el-senor-viene': 'maranata-el-senor-viene-clasica'   // el nombre del fichero ya estaba así en books-data.js
};
const f = path.join(__dirname, 'js/books-data.js');
let t = fs.readFileSync(f, 'utf8');
const hecho = [], igual = [], error = [];
Object.keys(LIBROS).forEach((id) => {
  const fichero = 'img/' + LIBROS[id] + '.jpg';
  const i = t.indexOf("\n    id: '" + id + "',");
  if (i < 0) { error.push(id + ' → no encuentro el libro en books-data.js'); return; }
  const a = t.indexOf('covers: [', i), siguiente = t.indexOf("\n  {\n    id: '", i + 5);
  if (a < 0 || (siguiente > 0 && a > siguiente)) { error.push(id + ' → el libro no tiene «covers»'); return; }
  const b = t.indexOf('\n    ],', a);
  const bloque = t.slice(a, b);
  if (bloque.includes("style: 'clasica'")) { igual.push(id); return; }
  const nueva = "{ style: 'clasica', file: '" + fichero + "' }";
  const t2 = bloque.trimEnd();
  const nuevoBloque = t2.endsWith(',') ? t2 + '\n      ' + nueva + ',' : t2 + ',\n      ' + nueva;
  t = t.slice(0, a) + nuevoBloque + t.slice(b);
  hecho.push(id);
});
if (hecho.length) fs.writeFileSync(f, t);
// Imágenes
const origen = path.join(__dirname, 'portadas-clasicas', 'img');
let copiadas = 0, existentes = 0;
if (fs.existsSync(origen)) {
  fs.mkdirSync(path.join(__dirname, 'img'), { recursive: true });
  fs.readdirSync(origen).forEach((n) => {
    const d = path.join(__dirname, 'img', n);
    if (fs.existsSync(d) && !SOBRE) { existentes++; return; }
    fs.copyFileSync(path.join(origen, n), d); copiadas++;
  });
}
hecho.forEach((h) => console.log('PORTADA CLÁSICA DECLARADA: ' + h));
igual.forEach((h) => console.log('Ya tenía la clásica declarada: ' + h));
error.forEach((h) => console.log('ERROR: ' + h));
console.log('Imágenes copiadas: ' + copiadas + ' | ya existían (no tocadas): ' + existentes);
console.log('\nSiguiente paso: node verificar-catalogo.js');
