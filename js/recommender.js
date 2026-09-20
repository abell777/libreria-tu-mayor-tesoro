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
// CÓMO SE ORDENA EL RESULTADO (de más a menos peso):
//   1. Tu momento (pregunta 2): solo se recomiendan libros de esa necesidad.
//      Cuenta más si es la PRIMERA necesidad del libro en BOOK_NEEDS
//      (books-data.js) y si su tema es el "núcleo" de esa necesidad
//      (NUCLEO_NECESIDAD, más abajo).
//   2. Tipo de lectura (pregunta 3): coincidencia exacta > lectura contigua
//      (ligera↔práctica↔profunda) > la contraria.
//   3. Para quién (pregunta 1): pequeño empujón si el libro encaja con esa
//      persona.
//   Empates: gana el libro más específico, luego el tomo más bajo, luego el
//   "Nuevo" y por último el más barato. Nunca se recomiendan dos ediciones
//   ni dos tomos de la misma obra, ni más de una Biblia.
//
// Para ajustar el resultado solo hay tres cosas que mirar:
//   · AUDIENCIAS       → a qué necesidades apunta cada destinatario
//   · PERFIL_MANUAL    → libros cuya profundidad se fija a mano
//   · NUCLEO_NECESIDAD → qué temas son el centro de cada necesidad
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
    { slug: 'yo', label: 'Para mí', desc: 'Quiero leerlo yo', boost: [], motivo: '' },
    { slug: 'pareja', label: 'Para mi pareja o mi matrimonio', desc: 'Para leerlo juntos', boost: ['familia-y-pareja'], motivo: 'encaja para leerlo en pareja o en familia' },
    { slug: 'hijos', label: 'Para mis hijos o mi labor como padre', desc: 'Crianza y educación', boost: ['criar-a-mis-hijos', 'familia-y-pareja'], motivo: 'encaja para quien educa a sus hijos' },
    { slug: 'regalo', label: 'Para regalar a alguien', desc: 'Un detalle con sentido', boost: ['primeros-pasos'], motivo: 'es un título sencillo y muy leído, buen regalo' },
    { slug: 'empieza', label: 'Para alguien que empieza en la fe', desc: 'Primera lectura', boost: ['primeros-pasos', 'conocer-a-jesus'], motivo: 'es una buena puerta de entrada para quien empieza en la fe' },
    { slug: 'iglesia', label: 'Para mi servicio en la iglesia', desc: 'Líderes y maestros', boost: ['servir-y-compartir'], motivo: 'está pensado para quien sirve en la iglesia' }
  ];

  // ---- Pregunta 3: tipo de lectura ---------------------------------------
  var PROFUNDIDADES = [
    { slug: 'ligera', label: 'Ligera y devocional', desc: 'Lecturas breves, una cada día' },
    { slug: 'practica', label: 'Práctica, para aplicar', desc: 'Consejos concretos para el día a día' },
    { slug: 'profunda', label: 'Teológica, para estudiar a fondo', desc: 'Obras extensas y de estudio' },
    { slug: 'indiferente', label: 'Me da igual, sorpréndeme', desc: 'Lo mejor para mi caso' }
  ];

  var ORDEN_PERFIL = { ligera: 0, practica: 1, profunda: 2 };
  var NOMBRE_PERFIL = { ligera: 'ligera', practica: 'práctica', profunda: 'de estudio' };

  // Libros cuya profundidad no se deduce bien de su tema (o que quieres
  // corregir). Valores: 'ligera' | 'practica' | 'profunda'.
  var PERFIL_MANUAL = {
    'creencias-de-los-adventistas-del-septimo-dia': 'profunda',
    'discurso-maestro-de-jesucristo': 'practica',
    'discurso-maestro-de-jesucristo-tapa-dura': 'practica',
    'palabras-de-vida-del-gran-maestro': 'practica'
  };

  // Clasifica un libro en ligera / práctica / profunda a partir de su tema.
  // Si el tema no permite saberlo devuelve null: en ese caso no se le
  // promete nada al cliente ni se le penaliza.
  function perfilDe(book) {
    if (PERFIL_MANUAL[book.id]) return PERFIL_MANUAL[book.id];
    var subs = book.subcategory || [];
    function tiene(s) { return subs.indexOf(s) !== -1; }
    if (tiene('devocionales')) return 'ligera';
    if (book.category === 'biblias') return 'profunda';
    if (tiene('historia-biblica') || tiene('profecia-y-ultimos-tiempos') || tiene('doctrina-y-fe')) return 'profunda';
    if (tiene('salud') || tiene('familia-y-hogar') || tiene('educacion') ||
        tiene('ministerio-y-evangelismo') || tiene('mayordomia') ||
        tiene('vida-cristiana') || tiene('musica')) return 'practica';
    return null;
  }

  function esDevocional(book) {
    return (book.subcategory || []).indexOf('devocionales') !== -1;
  }

  // Temas que son el "núcleo" de cada necesidad. Un libro que figura en
  // esa necesidad pero no tiene ninguno de estos temas se considera un
  // encaje secundario (por ejemplo: un tomo de consejos no es "una lectura
  // para cada día"). '@biblias' = la categoría Biblias. Las necesidades que
  // no aparecen aquí se aceptan tal cual están en BOOK_NEEDS.
  var NUCLEO_NECESIDAD = {
    'crecer-cada-dia': ['devocionales'],
    'estudiar-la-biblia': ['historia-biblica', 'doctrina-y-fe', '@biblias'],
    'conocer-a-jesus': ['vida-de-cristo'],
    'criar-a-mis-hijos': ['educacion', 'familia-y-hogar'],
    'familia-y-pareja': ['familia-y-hogar'],
    'cuidar-mi-salud': ['salud'],
    'entender-el-futuro': ['profecia-y-ultimos-tiempos'],
    'servir-y-compartir': ['ministerio-y-evangelismo', 'mayordomia', 'educacion', 'musica'],
    'dudas-de-fe': ['doctrina-y-fe']
  };

  function esNucleo(book, slug) {
    var nucleo = NUCLEO_NECESIDAD[slug];
    if (!nucleo) return true;
    var subs = book.subcategory || [];
    return nucleo.some(function (t) {
      return t === '@biblias' ? book.category === 'biblias' : subs.indexOf(t) !== -1;
    });
  }

  // 0 = el libro no es de esa necesidad. Si lo es, de 0.3 a 1: más alto
  // cuanto antes aparece esa necesidad en la lista del libro y si su tema
  // es el núcleo de la necesidad.
  function fuerzaNecesidad(book, slug) {
    var pos = (book.needs || []).indexOf(slug);
    if (pos === -1) return 0;
    var f = pos === 0 ? 1 : (pos === 1 ? 0.85 : 0.7);
    return esNucleo(book, slug) ? f : f * 0.5;
  }

  // Una misma obra puede venir en varias ediciones o tomos: se recomienda
  // una sola vez ("Testimonios Selectos, Tomo I" y "Tomo II" son la misma
  // familia). Todas las Biblias cuentan como una.
  function familiaDe(book) {
    if (book.category === 'biblias') return 'biblia';
    return book.title.replace(/,?\s*(tomo\s+[ivx0-9]+|[0-9]+)\s*$/i, '').trim().toLowerCase();
  }

  function numeroDeTomo(book) {
    var m = book.title.match(/(?:tomo\s+)?([ivx]+|\d+)\s*$/i);
    if (!m) return 0;
    var v = m[1].toUpperCase();
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    var romanos = { I: 1, V: 5, X: 10 }, total = 0;
    for (var i = 0; i < v.length; i++) {
      var cur = romanos[v[i]], sig = romanos[v[i + 1]] || 0;
      total += cur < sig ? -cur : cur;
    }
    return total;
  }

  function listaEnEspanol(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
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
  // Pesos (ver la explicación de la cabecera): momento 35-100, tipo de
  // lectura 0-30, destinatario 0-18.
  function recomendar() {
    var audiencia = AUDIENCIAS.filter(function (a) { return a.slug === respuestas.audiencia; })[0] || AUDIENCIAS[0];
    var necesidad = respuestas.necesidad;
    var prof = respuestas.profundidad;
    var nec = window.NEED_BY_SLUG[necesidad];

    var candidatos = [];
    window.BOOKS.forEach(function (b) {
      // Los títulos que aún no están a la venta no se recomiendan: no
      // podríamos enviarlos.
      if (window.isComingSoon && window.isComingSoon(b)) return;

      // 1) Tu momento: si el libro no es de esa necesidad, no entra.
      var fuerza = fuerzaNecesidad(b, necesidad);
      if (!fuerza) return;
      var puntos = 100 * fuerza;

      var needs = b.needs || [];
      var perfil = perfilDe(b);
      var motivos = { audiencia: '', momento: '', lectura: '' };

      motivos.momento = fuerza >= 0.8
        ? 'responde a «' + (nec ? nec.label : 'tu momento') + '»'
        : 'también acompaña en «' + (nec ? nec.label : 'tu momento') + '»';

      // 2) Tipo de lectura: exacta > contigua > contraria.
      var distancia = null;
      if (prof === 'indiferente') {
        puntos += 15; // sin preferencia: nadie sube ni baja
      } else if (perfil) {
        distancia = Math.abs(ORDEN_PERFIL[perfil] - ORDEN_PERFIL[prof]);
        puntos += distancia === 0 ? 30 : (distancia === 1 ? 12 : 0);
        if (distancia === 0) {
          motivos.lectura = perfil === 'ligera'
            ? (esDevocional(b) ? 'son lecturas breves, para leer un poco cada día' : 'es una lectura ligera y fácil de retomar')
            : (perfil === 'practica' ? 'es muy práctico, para aplicarlo desde el primer capítulo' : 'es una obra de estudio, para leer con calma y subrayar');
        }
      } else {
        puntos += 12; // no sabemos su profundidad: ni premio ni castigo fuerte
      }

      // 3) Para quién: pequeño empujón si encaja con esa persona.
      var encajaAudiencia = audiencia.boost.some(function (slug) { return needs.indexOf(slug) !== -1; });
      if (encajaAudiencia) {
        puntos += 15;
        if (audiencia.motivo) motivos.audiencia = audiencia.motivo;
      }
      // Para regalar o para quien empieza, mejor un libro asequible.
      if ((respuestas.audiencia === 'regalo' || respuestas.audiencia === 'empieza') &&
          typeof b.price === 'number' && b.price <= 12) {
        puntos += 3;
      }

      candidatos.push({
        book: b, puntos: puntos, motivos: motivos, perfil: perfil, distancia: distancia, fuerza: fuerza,
        especifico: 1 / Math.max(1, needs.length)
      });
    });

    candidatos.sort(function (a, b) {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.especifico !== a.especifico) return b.especifico - a.especifico;
      var ta = numeroDeTomo(a.book), tb = numeroDeTomo(b.book);
      if (ta !== tb) return ta - tb;
      var na = a.book.badge === 'Nuevo' ? 1 : 0, nb = b.book.badge === 'Nuevo' ? 1 : 0;
      if (na !== nb) return nb - na;
      return (a.book.price || 99) - (b.book.price || 99);
    });

    // Una sola vez cada obra (ediciones y tomos) y como mucho una Biblia.
    var vistos = {};
    var unicos = [];
    candidatos.forEach(function (c) {
      var fam = familiaDe(c.book);
      if (vistos[fam]) return;
      vistos[fam] = true;
      unicos.push(c);
    });
    var elegidos = unicos.slice(0, 3);

    // Si has pedido un tipo de lectura y ninguna de las tres es de ese tipo,
    // pero en ese momento SÍ existe alguna que lo es y tiene esa necesidad
    // como una de sus principales, la última plaza es para ella. (Si solo
    // encaja de refilón con tu momento, es mejor avisar de que no tenemos
    // ese tipo de lectura que recomendar algo que no viene a cuento.)
    if (prof !== 'indiferente' && elegidos.length === 3 &&
        !elegidos.some(function (c) { return c.perfil === prof; })) {
      var exacto = unicos.slice(3).filter(function (c) { return c.perfil === prof && c.fuerza >= 0.5; })[0];
      if (exacto) {
        elegidos[2] = exacto;
        elegidos.sort(function (a, b) { return b.puntos - a.puntos; });
      }
    }
    return elegidos;
  }

  // Frase "Te lo proponemos porque…" en el mismo orden que las preguntas
  // (para quién → momento → tipo de lectura) y avisando con honestidad
  // cuando el libro no es exactamente del tipo que se pidió.
  function explicacion(c) {
    var partes = [];
    if (c.motivos.audiencia) partes.push(c.motivos.audiencia);
    if (c.motivos.momento) partes.push(c.motivos.momento);
    if (c.motivos.lectura) partes.push(c.motivos.lectura);
    var frase = partes.length
      ? 'Te lo proponemos porque ' + listaEnEspanol(partes) + '.'
      : 'Es uno de los títulos que mejor responde a lo que nos has contado.';
    var prof = respuestas.profundidad;
    if (prof !== 'indiferente' && c.perfil && c.perfil !== prof) {
      frase += ' No es una lectura ' + NOMBRE_PERFIL[prof] + ', sino ' + NOMBRE_PERFIL[c.perfil] +
        '; aun así es de lo que mejor encaja con tu momento.';
    }
    return frase;
  }

  // Si ninguna de las lecturas propuestas es del tipo pedido (porque ahora
  // mismo no tenemos ninguna para ese momento), lo decimos claramente.
  function avisoTipo(elegidos) {
    var prof = respuestas.profundidad;
    if (prof === 'indiferente' || !elegidos.length) return '';
    var hay = elegidos.some(function (c) { return c.perfil === prof; });
    if (hay) return '';
    return ' Ahora mismo no tenemos para este momento una lectura ' + NOMBRE_PERFIL[prof] + ' como la que pedías; te mostramos las que más se acercan.';
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
          (necesidad ? '<p class="wizard-lede">Has dicho que buscas <strong>' + escapeHTML(necesidad.label.toLowerCase()) + '</strong>. Esto es lo que te llevaríamos del estante, de más a menos ajustado a tus respuestas:' + avisoTipo(elegidos) + '</p>' : '') +
          '<div class="reco-list">' +
            elegidos.map(function (c) {
              var b = c.book;
              var motivo = explicacion(c);
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
