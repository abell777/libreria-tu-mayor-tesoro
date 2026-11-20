# Librería tu mayor tesoro

Tienda de libros (Biblias, Elena G. White y literatura afín) en **HTML + CSS + JS puro, sin build**,
sobre **Firebase** (Hosting + Firestore + Auth + Storage + Cloud Functions) y pagos con Stripe.
Proyecto Firebase: `libreria-tu-mayor-tesoro`.

## Mapa del proyecto

```
/                        Páginas públicas (.html). Se quedan en la raíz a propósito: sus URLs ya
│                        están en Google, en sitemap.xml y en los correos. No las muevas.
├─ css/styles.css        Todos los estilos. Tokens de marca al principio (:root).
├─ js/
│  ├─ core/              Lo que carga (casi) toda página: config, auth, main, cart, cookies,
│  │                     gift-options, search, wishlist
│  ├─ data/              Los DATOS de la tienda: books-data (catálogo), ew-pricing (precios de
│  │                     impresión), shipping-rates (tarifas de envío)
│  ├─ pages/             Un archivo por página/función concreta: shop, product, checkout, account,
│  │                     personalizado, seguimiento, glosario, recursos, consejo, soul-finder…
│  └─ admin/             Solo para admin.html: admin, admin-encargos, admin-stats
├─ functions/            Cloud Functions (servidor): index.js (pedidos, Stripe, correos…),
│                        ew-pricing.js y shipping-rates.js (copias de js/data/)
├─ scripts/              Herramientas de Node (no se publican en la web)
│  ├─ verificar-catalogo.js   Se ejecuta SOLO antes de cada deploy (predeploy)
│  ├─ anadir-libros.js        Alta de libros nuevos
│  ├─ anadir-portadas.js      Alta de portadas «clásica»
│  ├─ comprobar-web.js        Detecta enlaces rotos, errores de sintaxis y menú/pie desincronizados
│  ├─ sincronizar-cabecera-pie.js  Copia el menú y el pie a todas las páginas
│  └─ plantillas/             menu.html y pie.html: el ÚNICO sitio donde se editan
├─ img/                  Imágenes (.webp + .jpg)
├─ firebase.json · firestore.rules · firestore.indexes.json · storage.rules · .firebaserc
└─ sitemap.xml · robots.txt · site.webmanifest
```

## Comandos habituales

| Quiero…                                   | Comando                  |
|-------------------------------------------|--------------------------|
| Ver la web en local                       | `npm run servir`         |
| Comprobar enlaces rotos y sintaxis        | `npm run comprobar`      |
| Cambiar el menú o el pie en TODAS las páginas | edita `scripts/plantillas/` y `npm run sincronizar` |
| Comprobar que web y servidor coinciden    | `npm run verificar`      |
| Publicar todo                             | `npm run deploy`         |
| Publicar solo la web / solo el servidor   | `npm run deploy:web` · `npm run deploy:functions` |
| Añadir libros nuevos                      | `npm run libros:anadir`  |
| Añadir portadas «clásica»                 | `npm run portadas:anadir`|

`firebase deploy` ejecuta `verificar-catalogo.js` solo: si web y servidor no coinciden, **para el despliegue**.

## Archivos que viven duplicados (web ↔ servidor)

El servidor nunca se fía de los precios del navegador, así que tiene su propia copia.
**Si cambias uno, cambia el otro** (`npm run verificar` te avisa si se desajustan):

| Web (navegador)               | Servidor                      | Qué contiene           |
|-------------------------------|-------------------------------|------------------------|
| `js/data/shipping-rates.js`   | `functions/shipping-rates.js` | Tarifas de envío (idénticos) |
| `js/data/ew-pricing.js`       | `functions/ew-pricing.js`     | Precios de impresión   |
| `js/data/books-data.js`       | `CATALOGO` en `functions/index.js` | Catálogo (lo sincroniza solo el predeploy) |
| `js/core/gift-options.js`     | bloque de regalo en `functions/index.js` | Precios de opciones de regalo |

## Seguridad: qué se publica y qué no

Hosting publica la carpeta raíz entera (`"public": "."`), así que `firebase.json → hosting.ignore`
deja fuera todo lo que no es web: `scripts/`, `functions/`, `package.json`, copias `*.bak*`,
`_archivo/`, reglas, README, etc. **Si creas una carpeta o archivo nuevo que no sea web, añádelo ahí.**

## Reglas de orden (para que siga así)

- JS nuevo de una página → `js/pages/`. Si lo usan casi todas → `js/core/`. Si son datos → `js/data/`.
- Scripts de Node → `scripts/`. Nunca en la raíz.
- Copias de seguridad → fuera del proyecto o en `_archivo/` (ni se publica ni se sube a git).
- Páginas HTML nuevas → raíz + añadir a `sitemap.xml` (`npm run comprobar` avisa si falta el archivo).

## Menú y pie de página

Están escritos en el HTML de cada página (salen al instante y sin JavaScript), pero se editan en un
solo sitio: `scripts/plantillas/menu.html` y `pie.html`. Después, `npm run sincronizar` los copia a las
31 páginas (todas menos `admin.html`). `npm run comprobar` avisa si alguna página se ha quedado distinta.
La pestaña activa del menú la marca `js/core/main.js` según la página.

## Orden de la Home

Hero → Novedades → Libros destacados → Categorías → ¿Qué busca tu alma hoy? → Guías para empezar →
Pedido personalizado. Cada sección es un bloque `<section>` independiente en `index.html`: para
reordenar, corta y pega el bloque entero.

## Seguridad — capas y pendientes

Capas activas: reglas de Firestore/Storage (cada cliente solo toca lo suyo; campos y enlaces validados),
precios y pedidos recalculados en el servidor, firma del webhook de Stripe, claves en Secret Manager,
límite de intentos por IP/cuenta (`comprobarLimite`), moderación de opiniones, CSP + HSTS + cabeceras en
`firebase.json`, `security.txt`.

Pendiente de TI (consola, no se puede hacer desde el código):
1. **App Check obligatorio**: `EXIGIR_APPCHECK` en `functions/index.js` (instrucciones allí) + «Enforce» en
   Firestore y Storage desde la consola de App Check.
2. **Restringir la clave de API** (Google Cloud → APIs y servicios → Credenciales): solo referentes
   `libreriatumayortesoro.com/*` y `libreria-tu-mayor-tesoro.firebaseapp.com/*`.
3. **Verificación en 2 pasos** en la cuenta de Google del administrador (la que tiene el UID de admin) y en la de Gmail.
4. **Authentication → Configuración**: activar «protección contra enumeración de correos» y política de contraseñas.
5. **Alertas de presupuesto** en Google Cloud (Facturación → Presupuestos) para enterarte si un bot dispara el gasto.
6. **Stripe Radar**: revisar reglas (bloquear tarjetas con CVC/CP incorrectos) y activar avisos de disputas.
