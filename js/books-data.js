// ==========================================================================
// Catálogo de libros — ÚNICA fuente de datos de producto para toda la web.
// Se usa en: categoria.html (listado/filtros/buscador), producto.html
// (ficha dinámica) e index.html (destacados).
//
// Para añadir un libro nuevo: copia un objeto, cambia el "id" (debe ser
// único, sin espacios) y rellena sus campos. No hace falta tocar más
// archivos: aparecerá solo en el catálogo, en el buscador y en su propia
// ficha de producto (producto.html?id=tu-id).
// ==========================================================================
window.BOOKS = [
  {
    id: 'el-conflicto-de-los-siglos',
    title: 'El Conflicto de los Siglos',
    author: 'Elena G. White',
    authorSlug: 'elena-g-white',
    category: 'elena-white',
    categoryLabel: 'Elena G. White',
    price: 18.54,
    format: 'Tapa dura',
    formatSlug: 'tapa-dura',
    priceNote: 'IVA incluido',
    cover: 'img/el-conflicto-de-los-siglos.jpg',
    badge: null,
    description: 'Un recorrido por la gran lucha entre el bien y el mal a través de la historia, desde la destrucción de Jerusalén hasta la restauración final de la tierra. Un clásico de la literatura devocional adventista, con un lenguaje claro pensado tanto para el estudio personal como para el regalo.',
    idioma: 'Español'
  },
  {
    id: 'el-deseado-de-todas-las-gentes',
    title: 'El Deseado de Todas las Gentes',
    author: 'Elena G. White',
    authorSlug: 'elena-g-white',
    category: 'elena-white',
    categoryLabel: 'Elena G. White',
    price: 13.20,
    format: 'Tapa blanda, A5',
    formatSlug: 'rustica',
    priceNote: 'Envío incluido',
    cover: 'img/el-deseado-de-todas-las-gentes.jpg',
    badge: null,
    description: 'Una mirada cercana a la vida de Jesús, desde su nacimiento hasta su ascensión, que combina el relato bíblico con reflexiones devocionales. Uno de los libros más leídos de Elena G. White, en una edición manejable en tapa blanda tamaño A5.',
    idioma: 'Español'
  },
  {
    id: 'historia-de-los-patriarcas-y-profetas',
    title: 'Historia de los Patriarcas y Profetas',
    author: 'Elena G. White',
    authorSlug: 'elena-g-white',
    category: 'elena-white',
    categoryLabel: 'Elena G. White',
    price: 25.20,
    format: 'Edición tapa dura',
    formatSlug: 'tapa-dura',
    priceNote: 'IVA incluido',
    cover: 'img/historia-de-los-patriarcas-y-profetas.jpg',
    badge: null,
    description: 'Repasa los grandes relatos del Antiguo Testamento, desde la creación hasta el rey David, iluminando el carácter de Dios a través de la vida de los patriarcas y los primeros profetas. Edición en tapa dura, pensada para durar en tu biblioteca.',
    idioma: 'Español'
  },
  {
    id: 'profetas-y-reyes',
    title: 'Profetas y Reyes',
    author: 'Elena G. White',
    authorSlug: 'elena-g-white',
    category: 'elena-white',
    categoryLabel: 'Elena G. White',
    price: 10.83,
    format: 'Edición tapa blanda',
    formatSlug: 'rustica',
    priceNote: 'IVA incluido',
    cover: 'img/profetas-y-reyes.jpg',
    badge: 'Nuevo',
    description: 'Continúa el relato bíblico a través de los reinos de Israel y Judá, la obra de Elías, Eliseo, Isaías y los profetas mayores, hasta el regreso del cautiverio babilónico. Una edición cuidada en tapa blanda, ideal para el estudio diario.',
    idioma: 'Español'
  }
];

// ---- Utilidades compartidas de catálogo -----------------------------------
window.BooksCatalog = {
  getById: function (id) {
    return window.BOOKS.filter(function (b) { return b.id === id; })[0] || null;
  },
  related: function (book, max) {
    max = max || 4;
    return window.BOOKS
      .filter(function (b) { return b.id !== book.id && b.category === book.category; })
      .slice(0, max);
  }
};
