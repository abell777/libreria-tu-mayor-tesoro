// ============================================================================
// sincronizar-cabecera-pie.js — un solo sitio para el MENÚ y el PIE de página.
//   npm run sincronizar
// El menú de categorías y el pie están escritos en el HTML de cada página (así
// salen al instante y también sin JavaScript). Para no editar 30 archivos a
// mano, edita las plantillas y ejecuta este script:
//     scripts/plantillas/menu.html   → <ul class="category-list"> del menú
//     scripts/plantillas/pie.html    → <footer class="site-footer"> entero
// Lo copia en todas las páginas .html de la raíz (menos admin.html). Es seguro
// repetirlo: si ya está igual, no toca nada. La pestaña «activa» del menú la
// marca solo js/core/main.js según la página en la que estés.
// ============================================================================
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(f, 'utf8');
const menu = leer(path.join(__dirname, 'plantillas', 'menu.html')).replace(/\s+$/, '');
const pie = leer(path.join(__dirname, 'plantillas', 'pie.html')).replace(/\s+$/, '');
const RE_MENU = /[ \t]*<ul class="category-list">[\s\S]*?<\/ul>/;
const RE_PIE = /<footer class="site-footer">[\s\S]*?<\/footer>/;
let cambiadas = 0, sinBloque = [];
fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== 'admin.html').sort().forEach((f) => {
  const p = path.join(ROOT, f); const orig = leer(p); let t = orig;
  if (RE_MENU.test(t)) t = t.replace(RE_MENU, () => menu); else sinBloque.push(f + ' (menú)');
  if (RE_PIE.test(t)) t = t.replace(RE_PIE, () => pie); else sinBloque.push(f + ' (pie)');
  if (t !== orig) { fs.writeFileSync(p, t); cambiadas++; console.log('actualizada: ' + f); }
});
console.log(cambiadas ? '\n' + cambiadas + ' página(s) actualizadas.' : 'Todo estaba ya sincronizado.');
if (sinBloque.length) console.log('⚠️  Sin bloque que sustituir: ' + sinBloque.join(', '));
