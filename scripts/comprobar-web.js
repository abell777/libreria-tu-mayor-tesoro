// ============================================================================
// comprobar-web.js — revisa que la web no tenga enlaces rotos.   npm run comprobar
//   · Cada <script src>, <link href> y <a href> local de los .html apunta a un
//     archivo que existe (ignora URLs externas, #anclas, mailto: y tel:).
//   · Cada URL de sitemap.xml corresponde a una página que existe.
//   · Cada archivo de js/ y css/ está usado por alguna página (avisa de huérfanos).
//   · Cada .js de js/ y functions/ tiene la sintaxis correcta.
//   · El menú y el pie de cada página son iguales que scripts/plantillas/ (si no: npm run sincronizar).
// Solo LEE: no modifica nada. Sale con error (código 1) si encuentra algo roto.
// Las imágenes solo se comprueban si existe la carpeta img/.
// ============================================================================
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const existe = (p) => fs.existsSync(path.join(ROOT, p));
const errores = [], avisos = [];
const htmls = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const usados = new Set();
const HAY_IMG = existe('img');
// producto.html lo sirve una Cloud Function (ver firebase.json → rewrites): el archivo real es producto-app.html
const PAGINA_VIRTUAL = new Set(['producto.html']);

htmls.forEach((h) => {
  const t = fs.readFileSync(path.join(ROOT, h), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const re = /(?:src|href)\s*=\s*"([^"]+)"/g; let m;
  while ((m = re.exec(t))) {
    let u = m[1].trim();
    if (!u || /^(https?:|\/\/|mailto:|tel:|data:|#|javascript:)/i.test(u)) continue;
    u = u.split('#')[0].split('?')[0];
    if (!u || u === '/' || u.endsWith('/')) continue;
    u = u.replace(/^\//, '');
    usados.add(u);
    if (/^img\//.test(u) && !HAY_IMG) continue;
    if (/\.(html|js|css|webmanifest|xml|txt)$/.test(u) || /^img\//.test(u)) {
      if (!existe(u) && !PAGINA_VIRTUAL.has(u)) errores.push(h + ' → enlaza a «' + u + '» y no existe');
    }
  }
});

if (existe('sitemap.xml')) {
  const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const re = /<loc>https?:\/\/[^/]+\/([^<?#]*)(?:\?[^<]*)?<\/loc>/g; let m;
  while ((m = re.exec(sm))) {
    const u = m[1]; if (!u || !u.endsWith('.html')) continue;
    if (!existe(u) && !PAGINA_VIRTUAL.has(u)) errores.push('sitemap.xml → «' + u + '» no existe');
  }
}

// Menú y pie iguales a la plantilla
(function () {
  const plantilla = (f) => fs.readFileSync(path.join(__dirname, 'plantillas', f), 'utf8').replace(/\s+$/, '');
  const menu = plantilla('menu.html'), pie = plantilla('pie.html');
  htmls.filter((h) => h !== 'admin.html').forEach((h) => {
    const t = fs.readFileSync(path.join(ROOT, h), 'utf8');
    const m = t.match(/[ \t]*<ul class="category-list">[\s\S]*?<\/ul>/), f = t.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
    if (!m || m[0] !== menu) errores.push(h + ' → el menú no coincide con scripts/plantillas/menu.html (npm run sincronizar)');
    if (!f || f[0] !== pie) errores.push(h + ' → el pie no coincide con scripts/plantillas/pie.html (npm run sincronizar)');
  });
})();

function recorrer(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? recorrer(dir + '/' + e.name) : [dir + '/' + e.name]);
}
['js', 'css'].forEach((d) => existe(d) && recorrer(d).forEach((f) => {
  if (!usados.has(f) && !/\.bak/.test(f)) avisos.push('«' + f + '» no lo usa ninguna página (¿sobra?)');
}));

['js', 'functions'].forEach((d) => existe(d) && recorrer(d).filter((f) => /\.js$/.test(f) && !/node_modules/.test(f)).forEach((f) => {
  try { new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); }
  catch (e) { errores.push(f + ' → error de sintaxis: ' + e.message); }
}));

avisos.forEach((a) => console.log('⚠️  ' + a));
if (errores.length) { errores.forEach((e) => console.error('✖ ' + e)); console.error('\n' + errores.length + ' problema(s). Corrígelos antes de desplegar.'); process.exit(1); }
console.log('✔ Web comprobada: ' + htmls.length + ' páginas, sin enlaces rotos ni errores de sintaxis.');
