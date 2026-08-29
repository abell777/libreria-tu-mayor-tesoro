# Librería Fundamento — Home

Página principal (Home) de la tienda de libros (Biblias, Elena G. White y literatura afín),
construida en **HTML + CSS + JS puro** (sin dependencias ni build) para que puedas abrirla
directamente o integrarla donde quieras (WordPress, Shopify, un proyecto React, etc.).

## Cómo verla

Abre `index.html` en el navegador. No requiere servidor ni instalación.

## Estructura de archivos

```
index.html          → estructura completa de la Home (las 5 secciones pedidas)
css/styles.css       → todos los estilos, con los tokens de marca al principio del archivo
js/main.js           → única interacción: abrir/cerrar el menú de categorías en móvil
```

## Identidad visual (heredada de tu app)

Extraje los tokens directamente de tu `globals.css` (tema "cream", el que usa tu app para
lectura cómoda) y de las fuentes declaradas en tu `layout.tsx`:

| Token         | Valor (oklch)              | Uso                                  |
|---------------|-----------------------------|---------------------------------------|
| `--navy`      | `oklch(0.31 0.05 258)`      | Texto principal, header oscuro, hero  |
| `--navy-deep` | `oklch(0.22 0.06 258)`      | Fondos oscuros, footer                |
| `--gold`      | `oklch(0.64 0.10 78)`       | Acentos, botones, iconos              |
| `--parchment` | `oklch(0.97 0.015 85)`      | Texto claro sobre fondo oscuro        |
| `--background`| `oklch(0.964 0.017 88)`     | Fondo general (papel/crema)           |
| `--card`      | `oklch(0.987 0.012 88)`     | Tarjetas, header                      |
| `--border`    | `oklch(0.88 0.025 84)`      | Bordes sutiles                        |

**Tipografía:** `Playfair Display` (serif, títulos) + `Source Sans 3` (sans, cuerpo) — las
mismas dos familias que usa tu app como fuente de interfaz y de lectura.

Todo esto vive en `:root` al principio de `css/styles.css`; si cambias un valor ahí, se
propaga a toda la página.

## Arquitectura de la Home (las 5 secciones pedidas)

1. **Header** (`.site-header`)
   Logo + buscador centrado + menú de categorías en una barra inferior. En móvil el buscador
   pasa a ocupar todo el ancho y las categorías se pliegan en un desplegable (botón hamburguesa).

2. **Hero** (`.hero`)
   Fondo navy con textura de "líneas de página" (sutil, referencia a la lectura), titular +
   texto + dos botones + estadísticas de catálogo. A la derecha, una escena ilustrada en
   CSS/SVG (pila de libros + libro flotante) — no usa fotografías de stock.

3. **Categorías destacadas** (`.category-grid`)
   4 tarjetas: Biblias, Elena G. White, Salud y familia, Profecía. Cada una es un enlace ancla
   (`#biblias`, `#elena-white`…) listo para apuntar a tus páginas de categoría reales.

4. **Grid de libros destacados** (`.book-grid`)
   8 tarjetas de producto. Cada `.book-card` tiene: portada ilustrada (gradiente navy/gold con
   el título superpuesto, en vez de una foto de producto que no tenías), categoría, título,
   autor, precio y botón "Añadir". Sustituir la portada por una imagen real es tan simple como
   cambiar el `<div class="book-cover cover--N">` por `<img>`.

5. **Footer** (`.site-footer`)
   Marca + redes, enlaces institucionales, enlaces de ayuda/legales, y contacto (dirección,
   teléfono, email) con iconos.

## Personalizar contenido

- **Textos y precios**: directamente en `index.html`, cada `<article class="book-card">` es
  independiente y fácil de duplicar.
- **Portadas de libro**: hay 8 variantes de gradiente (`.cover--1` a `.cover--8`) en
  `styles.css`. En cuanto tengas fotos reales de portada, cambia el `div.book-cover` por
  `<img src="..." class="book-cover-img">` (o dime y te preparo esa variante).
- **Categorías del menú**: lista `<ul class="category-list">` en el header — añade o quita
  `<li><a href="#...">...</a></li>`.

## Responsive

Puntos de corte principales: `980px` (grids pasan a 2 columnas), `900px` (hero y footer pasan
a una columna), `860px` (menú de categorías se convierte en desplegable móvil), `560px`
(grids a 1 columna). Probado visualmente en móvil y escritorio.

## Siguiente paso natural

Cuando quieras seguir, lo lógico sería: página de listado/categoría con filtros, ficha de
producto, carrito. Aquí solo entregué lo que pediste (Home con las 5 secciones) para no
adelantarme.
