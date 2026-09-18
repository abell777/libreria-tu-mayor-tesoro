// ==========================================================================
// Glosario de términos — glosario.html
// --------------------------------------------------------------------------
// Diccionario breve de términos bíblicos y de espiritualidad. Cada entrada
// puede llevar un "libro" (id del catálogo) y, si ese libro existe y está a
// la venta, se muestra un enlace a su ficha: el visitante que llega desde
// Google buscando "qué es la justificación" acaba descubriendo el catálogo.
//
// PARA AÑADIR UN TÉRMINO: copia una línea de TERMINOS y rellena
//   termino → la palabra
//   def     → la explicación (2-4 frases, en lenguaje llano)
//   libro   → (opcional) id de un libro de js/books-data.js
// El buscador, el contador y los datos estructurados de Google se
// actualizan solos.
// ==========================================================================
(function () {
  var TERMINOS = [
    { termino: 'Adventista', def: 'Quien espera («adviento» significa venida) el regreso de Jesús. Como nombre propio designa a la Iglesia Adventista del Séptimo Día, nacida en el siglo XIX.', libro: 'creencias-de-los-adventistas-del-septimo-dia' },
    { termino: 'Apocalipsis', def: 'Último libro de la Biblia. La palabra griega significa «revelación»: no es solo un anuncio de catástrofes, sino la revelación de Jesucristo y del final de la historia.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Arrepentimiento', def: 'Cambio de dirección: reconocer el error, dolerse de él y volverse a Dios. No es solo sentir culpa, sino dar la vuelta.', libro: 'el-camino-a-cristo' },
    { termino: 'Bautismo', def: 'Señal pública de que alguien ha decidido seguir a Cristo. Representa la muerte a la vida antigua y el comienzo de una nueva.', libro: 'creencias-de-los-adventistas-del-septimo-dia' },
    { termino: 'Colportor', def: 'Quien distribuye libros de contenido cristiano de casa en casa. Un oficio con mucha historia en el mundo editorial religioso.', libro: 'el-colportor-evangelico' },
    { termino: 'Devocional', def: 'Libro de lecturas breves, normalmente una para cada día, pensado para el momento diario de reflexión y oración.', libro: 'cada-dia-con-dios' },
    { termino: 'Discipulado', def: 'Proceso de aprender de Jesús como se aprende de un maestro: acompañando, imitando y practicando, no solo estudiando.', libro: 'palabras-de-vida-del-gran-maestro' },
    { termino: 'Don espiritual', def: 'Capacidad que Dios da a una persona para servir a los demás: enseñar, animar, administrar, cuidar enfermos, dar con generosidad.', libro: 'los-hechos-de-los-apostoles' },
    { termino: 'Escatología', def: 'Parte de la teología que estudia «las últimas cosas»: la segunda venida de Cristo, la resurrección, el juicio y la vida eterna.', libro: 'eventos-de-los-ultimos-dias' },
    { termino: 'Escuela Sabática', def: 'Clase de estudio de la Biblia que se celebra cada sábado antes del culto, organizada por grupos de edad.', libro: 'consejos-sobre-la-obra-de-escuela-sabatica' },
    { termino: 'Espíritu de Profecía', def: 'Expresión bíblica (Apocalipsis 19:10) que designa el don profético. En el ámbito adventista se usa también para referirse al conjunto de los escritos de Elena G. White.', libro: 'primeros-escritos' },
    { termino: 'Evangelio', def: 'Literalmente, «buena noticia»: que Dios ha venido a salvar por amor y no por mérito. También es el nombre de los cuatro primeros libros del Nuevo Testamento.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Evangelismo', def: 'Dar a conocer el evangelio a otras personas, de palabra y de obra, respetando siempre su libertad.', libro: 'el-evangelismo' },
    { termino: 'Expiación', def: 'Lo que Cristo hizo en la cruz para reconciliar al ser humano con Dios: cubrir la culpa y quitar de en medio lo que separaba.', libro: 'cristo-en-su-santuario' },
    { termino: 'Gracia', def: 'Favor que no se merece ni se paga. Es la palabra clave del cristianismo: Dios actúa primero, por amor, antes de que hagamos nada.', libro: 'la-maravillosa-gracia-de-dios' },
    { termino: 'Iglesia remanente', def: 'Grupo que permanece fiel cuando la mayoría se aparta. En la Biblia aparece muchas veces: siempre queda un resto por el que Dios sigue obrando.', libro: 'la-iglesia-remanente' },
    { termino: 'Inspiración', def: 'La acción del Espíritu de Dios sobre quien escribe o habla de su parte. No dicta palabra por palabra: comunica la verdad a través de una persona real, con su estilo y su cultura.', libro: 'mensajes-selectos-tomo-i' },
    { termino: 'Juicio investigador', def: 'Doctrina que entiende que, antes del regreso de Cristo, se revisa ante todo el universo quién ha aceptado de verdad la salvación. Es un juicio a favor del creyente, no en su contra.', libro: 'cristo-en-su-santuario' },
    { termino: 'Justificación', def: 'Ser declarado justo ante Dios por la fe en Cristo, no por las propias obras. Es un cambio de situación legal: el reo sale absuelto.', libro: 'fe-y-obras' },
    { termino: 'Ley de Dios', def: 'Los diez mandamientos y, en general, la voluntad de Dios expresada en normas. Para el cristiano no es el camino para salvarse, sino la forma que toma el amor.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Mayordomía', def: 'Administrar bien lo que no es nuestro: el tiempo, el dinero, la salud, los talentos y la propia tierra. El mayordomo cuida, no posee.', libro: 'consejos-sobre-la-mayordomia-cristiana' },
    { termino: 'Milenio', def: 'Los mil años mencionados en Apocalipsis 20. Distintas tradiciones cristianas los sitúan y los interpretan de forma diferente.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Nuevo nacimiento', def: 'La expresión que Jesús usó con Nicodemo para describir el cambio interior que produce el Espíritu: empezar de cero por dentro.', libro: 'el-camino-a-cristo' },
    { termino: 'Providencia', def: 'El cuidado de Dios sobre la historia y sobre cada vida. No significa que todo lo que pasa lo quiera Dios, sino que nada queda fuera de su alcance.', libro: 'dios-nos-cuida' },
    { termino: 'Reforma pro salud', def: 'Movimiento del siglo XIX, muy presente en el adventismo, que unió la fe con hábitos sanos: alimentación sencilla, descanso, ejercicio, aire puro y agua.', libro: 'consejos-sobre-la-salud' },
    { termino: 'Remanente', def: 'Ver «Iglesia remanente». En los profetas designa a los que vuelven del exilio y mantienen la fe.', libro: 'la-iglesia-remanente' },
    { termino: 'Resurrección', def: 'Volver a la vida por el poder de Dios. La de Jesús es el centro de la fe cristiana; la de los creyentes se espera para su regreso.', libro: 'la-segunda-venida-y-el-cielo' },
    { termino: 'Sábado', def: 'Séptimo día de la semana, apartado en el relato de la creación y en el cuarto mandamiento para el descanso y el encuentro con Dios.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Salvación', def: 'Ser rescatado del pecado y de la muerte. Es don de Dios y abarca el perdón, la transformación presente y la vida eterna.', libro: 'el-camino-a-cristo' },
    { termino: 'Santificación', def: 'El trabajo de toda una vida: crecer en el carácter de Cristo. Empieza en la conversión y no acaba hasta el final.', libro: 'edificacion-del-caracter' },
    { termino: 'Santuario', def: 'La tienda de reunión del desierto y, más tarde, el templo de Jerusalén. Sus servicios y su mobiliario explican de forma visual el plan de salvación.', libro: 'cristo-en-su-santuario' },
    { termino: 'Segunda venida', def: 'El regreso visible y personal de Jesús a esta tierra. La esperanza que sostiene toda la fe cristiana y de la que habla todo el Nuevo Testamento.', libro: 'la-segunda-venida-y-el-cielo' },
    { termino: 'Temperancia', def: 'Dominio propio: usar con moderación lo que hace bien y dejar del todo lo que hace daño.', libro: 'la-temperancia' },
    { termino: 'Testimonios para la Iglesia', def: 'Serie de nueve volúmenes con consejos de Elena G. White a las iglesias de su tiempo, sobre asuntos prácticos, espirituales y organizativos.', libro: 'testimonios-para-la-iglesia-tomo-2' },
    { termino: 'Tipo y antitipo', def: 'Forma de leer la Biblia en la que algo del Antiguo Testamento (el cordero, el santuario) anticipa una realidad posterior (Cristo, su obra).', libro: 'cristo-en-su-santuario' },
    { termino: 'Vida eterna', def: 'No solo una vida que dura siempre, sino una calidad de vida distinta que empieza ya en la relación con Dios.', libro: 'la-unica-esperanza' }
  ];

  var list = document.getElementById('glossaryList');
  var search = document.getElementById('glossarySearch');
  var countEl = document.getElementById('glossaryCount');
  var emptyEl = document.getElementById('glossaryEmpty');
  if (!list) return;

  function sinTildes(t) {
    return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  TERMINOS.sort(function (a, b) { return a.termino.localeCompare(b.termino, 'es'); });

  function libroDe(id) {
    if (!id || !window.BooksCatalog) return null;
    var b = window.BooksCatalog.getById(id);
    if (!b) return null;
    if (window.isComingSoon && window.isComingSoon(b)) return null;
    return b;
  }

  list.innerHTML = TERMINOS.map(function (t) {
    var libro = libroDe(t.libro);
    return (
      '<article class="glossary-item" id="' + sinTildes(t.termino).replace(/[^a-z0-9]+/g, '-') + '" data-term="' + escapeHTML(sinTildes(t.termino + ' ' + t.def)) + '">' +
        '<h2 class="glossary-term">' + escapeHTML(t.termino) + '</h2>' +
        '<p class="glossary-def">' + escapeHTML(t.def) + '</p>' +
        (libro
          ? '<p class="glossary-link">Para profundizar: <a href="producto.html?id=' + libro.id + '">' + escapeHTML(libro.title) + '</a></p>'
          : '') +
      '</article>'
    );
  }).join('');

  var items = Array.prototype.slice.call(list.querySelectorAll('.glossary-item'));

  function filtrar() {
    var q = sinTildes((search && search.value ? search.value : '').trim());
    var visibles = 0;
    items.forEach(function (el) {
      var coincide = !q || el.dataset.term.indexOf(q) !== -1;
      el.hidden = !coincide;
      if (coincide) visibles++;
    });
    if (countEl) countEl.textContent = visibles + (visibles === 1 ? ' término' : ' términos');
    if (emptyEl) emptyEl.hidden = visibles !== 0;
  }

  if (search) search.addEventListener('input', filtrar);
  filtrar();

  // Datos estructurados: ayuda a que Google entienda que esto es un
  // glosario y muestre las definiciones en los resultados.
  var ld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Glosario de términos bíblicos y de espiritualidad',
    url: 'https://www.libreriatumayortesoro.com/glosario.html',
    hasDefinedTerm: TERMINOS.map(function (t) {
      return { '@type': 'DefinedTerm', name: t.termino, description: t.def };
    })
  };
  var script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
})();
