// ==========================================================================
// Asistente de recomendación — asistente.html
// --------------------------------------------------------------------------
// Tres preguntas (¿para quién?, ¿qué momento?, ¿qué tipo de lectura?) y al
// final 2 o 3 libros recomendados, cada uno con una frase explicando POR QUÉ
// encaja con lo que ha contestado el cliente.
//
// No hay ninguna lista de recomendaciones escrita a mano: las sugerencias se
// calculan puntuando todo el catálogo con lo que ya sabemos de cada libro
// (sus necesidades de "¿Qué busca tu alma hoy?", su tema y su precio). Así,
// cada libro nuevo que añadas a js/books-data.js entra automáticamente en el
// asistente sin tocar este archivo.
//
// Para ajustar el resultado solo hay dos cosas que mirar:
//   · AUDIENCIAS  → a qué necesidades apunta cada destinatario
//   · PROFUNDIDAD → cómo se clasifica un libro en ligero / práctico / profundo
// ==========================================================================
(function () {
  var body = document.getElementById('wizardBody');
  var stepsEl = document.getElementById('wizardSteps');
  if (!body || !window.BOOKS || !window.NEEDS) return;

  function fmt(n) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- Pregunta 1: ¿para quién es? ---------------------------------------
  // Cada opción "empuja" hacia unas necesidades concretas del catálogo.
  var AUDIENCIAS = [
    { slug: 'yo', label: 'Para mí', desc: 'Quiero leerlo yo', boost: [] },
    { slug: 'pareja', label: 'Para mi pareja o mi matrimonio', desc: 'Para leerlo juntos', boost: ['familia-y-pareja'] },
    { slug: 'hijos', label: 'Para mis hijos o mi labor como padre', desc: 'Crianza y educación', boost: ['criar-a-mis-hijos', 'familia-y-pareja'] },
    { slug: 'regalo', label: 'Para regalar a alguien', desc: 'Un detalle con sentido', boost: ['primeros-pasos'] },
    { slug: 'empieza', label: 'Para alguien que empieza en la fe', desc: 'Primera lectura', boost: ['primeros-pasos', 'conocer-a-jesus'] },
    { slug: 'iglesia', label: 'Para mi servicio en la iglesia', desc: 'Líderes y maestros', boost: ['servir-y-compartir'] }
  ];

  // ---- Pregunta 3: tipo de lectura ---------------------------------------
  var PROFUNDIDADES = [
    { slug: 'ligera', label: 'Ligera y devocional', desc: 'Lecturas breves, una cada día' },
    { slug: 'practica', label: 'Práctica, para aplicar', desc: 'Consejos concretos para el día a día' },
    { slug: 'profunda', label: 'Teológica, para estudiar a fondo', desc: 'Obras extensas y de estudio' },
    { slug: 'indiferente', label: 'Me da igual, sorpréndeme', desc: 'Lo mejor para mi caso' }
  ];

  // Clasifica un libro en ligero / práctico / profundo a partir de su tema.
  function perfilDe(book) {
    var subs = book.subcategory || [];
    function tiene(s) { return subs.indexOf(s) !== -1; }
    if (tiene('devocionales')) return 'ligera';
    if (tiene('historia-biblica') || tiene('profecia-y-ultimos-tiempos') || tiene('doctrina-y-fe')) return 'profunda';
    if (book.category === 'biblias') return 'profunda';
    if (tiene('salud') || tiene('familia-y-hogar') || tiene('educacion') ||
        tiene('ministerio-y-evangelismo') || tiene('mayordomia')) return 'practica';
    return 'ligera';
  }

  var respuestas = { audiencia: null, necesidad: null, profundidad: null };
  var paso = 0;

  var PREGUNTAS = [
    {
      titulo: '¿Para quién es el libro?',
      lede: 'Nos ayuda a elegir el tono y el tipo de lectura.',
      opciones: AUDIENCIAS.map(function (a) { return { valor: a.slug, label: a.label, desc: a.desc }; }),
      guarda: function (v) { respuestas.audiencia = v; }
    },
    {
      titulo: '¿Qué momento estás atravesando?',
      lede: 'Elige lo que más se parezca a tu situación ahora mismo.',
      opciones: window.NEEDS.map(function (n) { return { valor: n.slug, label: n.question, desc: n.desc }; }),
      guarda: function (v) { respuestas.necesidad = v; }
    },
    {
      titulo: '¿Qué tipo de lectura prefieres?',
      lede: 'Hay libros para leer de un tirón y libros para años.',
      opciones: PROFUNDIDADES.map(function (p) { return { valor: p.slug, label: p.label, desc: p.desc }; }),
      guarda: function (v) { respuestas.profundidad = v; }
    }
  ];

  function pintarPasos() {
    if (!stepsEl) return;
    stepsEl.innerHTML = PREGUNTAS.map(function (p, i) {
      var estado = i < paso ? ' is-done' : (i === paso ? ' is-current' : '');
      return '<li class="wizard-step' + estado + '"><span>' + (i + 1) + '</span></li>';
    }).join('') +
      '<li class="wizard-step' + (paso >= PREGUNTAS.length ? ' is-current' : '') + '"><span>✓</span></li>';
  }

  function pintarPregunta() {
    var p = PREGUNTAS[paso];
    body.innerHTML =
      '<div class="wizard-question">' +
        '<h2>' + escapeHTML(p.titulo) + '</h2>' +
        '<p class="wizard-lede">' + escapeHTML(p.lede) + '</p>' +
        '<div class="wizard-options">' +
          p.opciones.map(function (o) {
            return '<button type="button" class="wizard-option" data-valor="' + escapeHTML(o.valor) + '">' +
              '<span class="wizard-option-label">' + escapeHTML(o.label) + '</span>' +
              '<span class="wizard-option-desc">' + escapeHTML(o.desc || '') + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        (paso > 0 ? '<button type="button" class="wizard-back" id="wizardBack">← Volver a la pregunta anterior</button>' : '') +
      '</div>';

    Array.prototype.slice.call(body.querySelectorAll('.wizard-option')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        p.guarda(btn.dataset.valor);
        paso++;
        if (paso < PREGUNTAS.length) { pintarPasos(); pintarPregunta(); }
        else { pintarPasos(); pintarResultado(); }
        body.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    var back = document.getElementById('wizardBack');
    if (back) back.addEventListener('click', function () { paso--; pintarPasos(); pintarPregunta(); });
  }

  // ---- Puntuación --------------------------------------------------------
  function recomendar() {
    var audiencia = AUDIENCIAS.filter(function (a) { return a.slug === respuestas.audiencia; })[0] || AUDIENCIAS[0];
    var necesidad = respuestas.necesidad;
    var prof = respuestas.profundidad;

    var candidatos = window.BOOKS.filter(function (b) {
      // Los títulos que aún no están a la venta no se recomiendan: no
      // podríamos enviarlos.
      return !(window.isComingSoon && window.isComingSoon(b));
    }).map(function (b) {
      var puntos = 0;
      var motivos = [];
      var needs = b.needs || [];

      if (needs.indexOf(necesidad) !== -1) {
        puntos += 10;
        var n = window.NEED_BY_SLUG[necesidad];
        if (n) motivos.push('está pensado justo para ' + n.label.toLowerCase());
      }
      audiencia.boost.forEach(function (slug) {
        if (needs.indexOf(slug) !== -1) {
          puntos += 4;
          var na = window.NEED_BY_SLUG[slug];
          if (na) motivos.push('encaja con lo que buscas: ' + na.label.toLowerCase());
        }
      });

      var perfil = perfilDe(b);
      if (prof === 'indiferente') {
        puntos += 1;
      } else if (perfil === prof) {
        puntos += 5;
        motivos.push(prof === 'ligera'
          ? 'son lecturas cortas, de una cada día'
          : (prof === 'practica' ? 'es muy práctico, para aplicarlo desde el primer capítulo' : 'es una obra de estudio, para leer con calma y subrayar'));
      } else if ((prof === 'ligera' && perfil === 'profunda') || (prof === 'profunda' && perfil === 'ligera')) {
        puntos -= 4;
      }

      // Para regalar o para quien empieza, mejor un libro asequible y
      // conocido que un tomo de estudio.
      if ((respuestas.audiencia === 'regalo' || respuestas.audiencia === 'empieza')) {
        if (needs.indexOf('primeros-pasos') !== -1) { puntos += 3; }
        if (typeof b.price === 'number' && b.price <= 12) puntos += 1;
      }
      if (b.badge === 'Nuevo') puntos += 0.5;

      return { book: b, puntos: puntos, motivos: motivos, perfil: perfil };
    }).filter(function (c) { return c.puntos > 0; });

    candidatos.sort(function (a, b) {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      return (a.book.price || 99) - (b.book.price || 99);
    });

    // Evita recomendar dos ediciones del mismo título (tapa dura y blanda).
    var vistos = {};
    var elegidos = [];
    candidatos.forEach(function (c) {
      if (elegidos.length >= 3) return;
      if (vistos[c.book.title]) return;
      vistos[c.book.title] = true;
      elegidos.push(c);
    });
    return elegidos;
  }

  function pintarResultado() {
    var elegidos = recomendar();
    var necesidad = window.NEED_BY_SLUG[respuestas.necesidad];

    if (!elegidos.length) {
      body.innerHTML =
        '<div class="wizard-result">' +
          '<h2>No queremos recomendarte por recomendar</h2>' +
          '<p class="wizard-lede">Con lo que nos has contado preferimos que lo vea una persona. Escríbenos y te contestamos con una recomendación pensada para tu caso.</p>' +
          '<p><a class="btn btn--primary" href="consejo.html">Pedir consejo a nuestro librero</a> ' +
          '<button type="button" class="btn btn--outline" id="wizardRestart">Volver a empezar</button></p>' +
        '</div>';
    } else {
      body.innerHTML =
        '<div class="wizard-result">' +
          '<span class="eyebrow">Nuestra recomendación</span>' +
          '<h2>' + (elegidos.length === 1 ? 'Este es el libro que te proponemos' : 'Estas ' + elegidos.length + ' lecturas encajan con tu momento') + '</h2>' +
          (necesidad ? '<p class="wizard-lede">Has dicho que buscas <strong>' + escapeHTML(necesidad.label.toLowerCase()) + '</strong>. Esto es lo que te llevaríamos del estante:</p>' : '') +
          '<div class="reco-list">' +
            elegidos.map(function (c) {
              var b = c.book;
              var motivo = c.motivos.length
                ? 'Te lo proponemos porque ' + c.motivos.slice(0, 2).join(' y ') + '.'
                : 'Es uno de los títulos que mejor responde a lo que nos has contado.';
              return (
                '<article class="reco-item">' +
                  '<a class="reco-cover" href="producto.html?id=' + b.id + '">' +
                    '<img src="' + toWebp(b.cover) + '" onerror="this.onerror=null;this.src=\'' + b.cover + '\'" alt="Portada de «' + escapeHTML(b.title) + '»" loading="lazy" decoding="async">' +
                  '</a>' +
                  '<div class="reco-body">' +
                    '<h3><a href="producto.html?id=' + b.id + '">' + escapeHTML(b.title) + '</a></h3>' +
                    '<p class="reco-author">' + escapeHTML(b.author) + ' · ' + escapeHTML(b.format) + '</p>' +
                    '<p class="reco-why">' + escapeHTML(motivo) + '</p>' +
                    '<p class="reco-desc">' + escapeHTML(b.description.slice(0, 180)) + '…</p>' +
                    '<p class="reco-foot"><span class="reco-price">' + fmt(b.price) + '&nbsp;€</span>' +
                      '<a class="btn btn--primary btn--sm" href="producto.html?id=' + b.id + '">Ver el libro</a></p>' +
                  '</div>' +
                '</article>'
              );
            }).join('') +
          '</div>' +
          '<p class="wizard-foot">' +
            '<button type="button" class="btn btn--outline btn--sm" id="wizardRestart">Probar con otras respuestas</button> ' +
            '<a class="btn btn--outline btn--sm" href="consejo.html">Prefiero que me aconseje una persona</a>' +
          '</p>' +
        '</div>';
    }

    var restart = document.getElementById('wizardRestart');
    if (restart) {
      restart.addEventListener('click', function () {
        respuestas = { audiencia: null, necesidad: null, profundidad: null };
        paso = 0;
        pintarPasos();
        pintarPregunta();
      });
    }
  }

  pintarPasos();
  pintarPregunta();
})();
