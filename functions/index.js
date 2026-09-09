// ==========================================================================
// Cloud Functions — Librería tu mayor tesoro
//
// "crearPedido" es la ÚNICA forma de crear un pedido a partir de ahora.
// El cliente (js/checkout.js) ya no escribe directamente en Firestore:
// solo manda el id y la cantidad de cada libro, y esta función recalcula
// el precio real desde el catálogo de aquí abajo. Así da igual lo que
// alguien manipule en la consola del navegador — el importe que se
// guarda y el que se cobra son siempre el real.
//
// 👉 IMPORTANTE: si añades, quitas o cambias el precio de un libro en
// js/books-data.js, actualiza también el objeto CATALOGO de aquí abajo.
// Son dos copias de la misma información a propósito (una para pintar la
// tienda rápido sin depender de la red, otra para que el servidor pueda
// confiar en sí mismo). Si algún día te cansas de mantener las dos, se
// puede mover el catálogo entero a Firestore — dímelo y lo hacemos.
// ==========================================================================
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// URL pública del sitio (se usa aquí y también más abajo en "productoMeta").
const SITE_URL = "https://www.libreriatumayortesoro.com";

// Claves de Stripe: NUNCA se escriben aquí. Se guardan de forma cifrada con
// "firebase functions:secrets:set STRIPE_SECRET_KEY" (y STRIPE_WEBHOOK_SECRET),
// y solo se leen dentro de la función en el momento de usarlas.
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

// ---- Catálogo oficial (debe coincidir con js/books-data.js) ----
// Incluye también description/cover/category/author porque "productoMeta"
// (más abajo) los necesita para escribir los metadatos de cada ficha de
// producto ANTES de que llegue al navegador — así WhatsApp, Facebook y
// Twitter muestran el título, la portada y el resumen reales del libro al
// compartir un enlace, en vez de los genéricos de la home.
const CATALOGO = {
  "el-conflicto-de-los-siglos": {
    title: "El Conflicto de los Siglos",
    format: "Tapa dura",
    price: 19.54,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-conflicto-de-los-siglos.jpg",
    description: "Un recorrido por la gran lucha entre el bien y el mal a través de la historia, desde la destrucción de Jerusalén hasta la restauración final de la tierra. Un clásico de la literatura devocional, con un lenguaje claro pensado tanto para el estudio personal como para el regalo.",
  },
  "el-deseado-de-todas-las-gentes": {
    title: "El Deseado de Todas las Gentes",
    format: "Tapa blanda, A5",
    price: 14.20,
    freeShipping: true,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-deseado-de-todas-las-gentes.jpg",
    description: "Una mirada cercana a la vida de Jesús, desde su nacimiento hasta su ascensión, que combina el relato de la Biblia con reflexiones devocionales. Uno de los libros más leídos de Elena G. White, en una edición manejable de tamaño A5.",
  },
  "historia-de-los-patriarcas-y-profetas": {
    title: "Historia de los Patriarcas y Profetas",
    format: "Edición tapa dura",
    price: 26.20,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/historia-de-los-patriarcas-y-profetas.jpg",
    description: "Repasa los grandes relatos del Antiguo Testamento, desde la creación hasta el rey David, iluminando el carácter de Dios a través de la vida de los patriarcas y los primeros profetas. Edición en tapa dura, pensada para durar en tu biblioteca.",
  },
  "profetas-y-reyes": {
    title: "Profetas y Reyes",
    format: "Edición tapa blanda",
    price: 11.83,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/profetas-y-reyes.jpg",
    description: "Continúa el relato de la Biblia a través de los reinos de Israel y Judá, la obra de Elías, Eliseo, Isaías y los profetas mayores, hasta el regreso del cautiverio babilónico. Una edición cuidada, ideal para el estudio diario.",
  },
  "la-fe-por-la-cual-vivo": {
    title: "La Fe por la Cual Vivo",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.14,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-fe-por-la-cual-vivo.jpg",
    description: "Un repaso claro y ordenado de las creencias fundamentales que fundamentan la fe cristiana, escrito para fortalecer la confianza del lector en las promesas de Dios. Ideal como libro de estudio personal o para compartir con quien empieza a explorar la fe.",
  },
  "la-educacion": {
    title: "La Educación",
    format: "Tapa blanda, 148 x 210 mm",
    price: 8.05,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-educacion.jpg",
    description: "Un clásico sobre el propósito real de la enseñanza: formar el carácter, no solo llenar la mente de datos. Plantea un modelo educativo que integra mente, cuerpo y espíritu, con ideas tan vigentes hoy como cuando se escribieron.",
  },
  "edificacion-del-caracter": {
    title: "Edificación del Carácter",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.52,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/edificacion-del-caracter.jpg",
    description: "Una guía práctica para crecer, paso a paso, en las virtudes cristianas: fe, virtud, conocimiento, templanza, paciencia, piedad, amor fraternal y caridad. Cada capítulo invita a examinar la propia vida y avanzar hacia un carácter más firme.",
  },
  "hijos-e-hijas-de-dios": {
    title: "Hijos e Hijas de Dios",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.21,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/hijos-e-hijas-de-dios.jpg",
    description: "Una colección de meditaciones breves sobre la identidad del creyente como hijo de Dios, pensada para el devocional diario. Anima a vivir con la seguridad de quien sabe a quién pertenece.",
  },
  "exaltad-a-jesus": {
    title: "Exaltad a Jesús",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.22,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/exaltad-a-jesus.jpg",
    description: "Un devocional centrado por completo en la persona de Cristo: su carácter, su amor y su obra de salvación. Cada lectura busca acercar al lector a una relación más cercana con Jesús.",
  },
  "en-los-lugares-celestiales": {
    title: "En los Lugares Celestiales",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.12,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/en-los-lugares-celestiales.jpg",
    description: "Meditaciones diarias inspiradas en la idea de que el creyente ya vive, en cierto sentido, en comunión con el cielo. Un libro pensado para empezar el día con una mirada puesta en lo eterno.",
  },
  "fe-y-obras": {
    title: "Fe y Obras",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.75,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/fe-y-obras.jpg",
    description: "Explora la relación entre la fe que salva y las obras que la acompañan, un tema clásico del cristianismo. Ayuda a entender que una fe viva se traduce siempre en una vida transformada.",
  },
  "el-otro-poder": {
    title: "El Otro Poder",
    format: "Tapa blanda, 148 x 210 mm",
    price: 7.03,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-otro-poder.jpg",
    description: "Reflexiona sobre el poder del amor, el hogar y la influencia personal frente a otras formas de poder más visibles. Un libro sobre cómo las decisiones cotidianas moldean el carácter y la familia.",
  },
  "el-ministerio-pastoral": {
    title: "El Ministerio Pastoral",
    format: "Tapa blanda, 148 x 210 mm",
    price: 8.57,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-ministerio-pastoral.jpg",
    description: "Dirigido a pastores y líderes de iglesia, reúne consejos prácticos sobre el cuidado de la congregación, la predicación y el ejemplo personal. Un manual de referencia para quienes ejercen el ministerio.",
  },
  "el-deseado-de-todas-las-gentes-tapa-blanda": {
    title: "El Deseado de Todas las Gentes",
    format: "Tapa blanda, 148 x 210 mm",
    price: 10.32,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-deseado-de-todas-las-gentes-tapa-blanda.jpg",
    description: "Una mirada cercana a la vida de Jesús, desde su nacimiento hasta su ascensión, que combina el relato de la Biblia con reflexiones devocionales. Uno de los libros más leídos de Elena G. White.",
  },
  "el-ministerio-de-publicaciones": {
    title: "El Ministerio de Publicaciones",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.14,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-ministerio-de-publicaciones.jpg",
    description: "Reúne consejos sobre la obra de impresión y distribución de literatura cristiana, un pilar histórico de la difusión del mensaje. De interés especial para quienes trabajan en editoriales o en la venta de libros religiosos.",
  },
  "el-ministerio-de-la-bondad": {
    title: "El Ministerio de la Bondad",
    format: "Tapa blanda, 148 x 210 mm",
    price: 8.23,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-ministerio-de-la-bondad.jpg",
    description: "Un llamado a vivir el evangelio a través de actos concretos de bondad y ayuda al necesitado. Muestra cómo la compasión práctica abre puertas que la sola predicación no siempre alcanza.",
  },
  "el-ministerio-medico": {
    title: "El Ministerio Médico",
    format: "Tapa blanda, 148 x 210 mm",
    price: 10.94,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-ministerio-medico.jpg",
    description: "Aborda la relación entre la salud física y la obra evangélica, con consejos sobre el cuidado del cuerpo como parte del mensaje cristiano integral. Un referente para quienes trabajan en el área de la salud desde la fe.",
  },
  "el-hogar-cristiano": {
    title: "El Hogar Cristiano",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.68,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-hogar-cristiano.jpg",
    description: "Un manual clásico sobre la vida familiar: el matrimonio, la crianza de los hijos y la atmósfera del hogar. Sigue siendo, décadas después, una de las obras más consultadas sobre la familia cristiana.",
  },
  "el-evangelismo": {
    title: "El Evangelismo",
    format: "Tapa blanda, 148 x 210 mm",
    price: 10.76,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-evangelismo.jpg",
    description: "Reúne principios y métodos para compartir la fe de forma eficaz, con énfasis en el amor y el respeto hacia quien escucha el mensaje. Un recurso práctico para quienes participan en la obra misionera de la iglesia.",
  },
  "el-conflicto-inminente": {
    title: "El Conflicto Inminente",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.84,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-conflicto-inminente.jpg",
    description: "Analiza los grandes acontecimientos finales descritos en la profecía de la Biblia y su relevancia para la vida cristiana actual. Un libro de estudio para quienes se interesan por la escatología bíblica.",
  },
  "el-colportor-evangelico": {
    title: "El Colportor Evangélico",
    format: "Tapa blanda, 148 x 210 mm",
    price: 7.49,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-colportor-evangelico.jpg",
    description: "Dirigido a quienes se dedican a la venta y distribución de literatura cristiana puerta a puerta, con consejos prácticos y motivación para esa labor. Un clásico dentro de la tradición del colportaje.",
  },
  "dios-nos-cuida": {
    title: "Dios Nos Cuida",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.31,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/dios-nos-cuida.jpg",
    description: "Un devocional matutino breve, pensado para leer cada mañana y empezar el día recordando el cuidado providencial de Dios. Fácil de intercalar en cualquier rutina, aunque sea apretada.",
  },
  "de-la-ciudad-al-campo": {
    title: "De la Ciudad al Campo",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.63,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/de-la-ciudad-al-campo.jpg",
    description: "Reflexiona sobre las ventajas de la vida sencilla en contacto con la naturaleza frente al ritmo agitado de la ciudad. Un libro que insta a repensar el estilo de vida desde una perspectiva cristiana.",
  },
  "la-pasion-del-amor": {
    title: "La Pasión del Amor",
    format: "Tapa blanda, 148 x 210 mm",
    price: 8.01,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-pasion-del-amor.jpg",
    description: "Una meditación sobre el amor de Dios manifestado en la cruz, y lo que ese amor significa para la vida diaria del creyente. Un libro breve pensado para la reflexión personal.",
  },
  "cristo-nuestro-salvador": {
    title: "Cristo Nuestro Salvador",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.93,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/cristo-nuestro-salvador.jpg",
    description: "Una introducción sencilla y accesible a la vida y la obra de Jesús, pensada tanto para nuevos creyentes como para quienes desean repasar lo esencial del evangelio. Ideal como primer libro de estudio sobre la persona de Cristo.",
  },
  "cristo-en-su-santuario": {
    title: "Cristo en Su Santuario",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.93,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/cristo-en-su-santuario.jpg",
    description: "Explica el simbolismo del santuario de la Biblia y su cumplimiento en la obra de Cristo. Un libro de estudio para profundizar en la doctrina del santuario.",
  },
  "el-deseado-de-todas-las-gentes-tapa-dura": {
    title: "El Deseado de Todas las Gentes",
    format: "Tapa dura, 155 x 235 mm",
    price: 17.58,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/el-deseado-de-todas-las-gentes-tapa-dura.jpg",
    description: "Una mirada cercana a la vida de Jesús, desde su nacimiento hasta su ascensión, que combina el relato de la Biblia con reflexiones devocionales. Pensada para quienes buscan un ejemplar más duradero o para regalo.",
  },
  "consejos-sobre-la-mayordomia-cristiana": {
    title: "Consejos sobre la Mayordomía Cristiana",
    format: "Tapa blanda, 148 x 210 mm",
    price: 8.51,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/consejos-sobre-la-mayordomia-cristiana.jpg",
    description: "Reúne principios sobre el uso responsable del tiempo, el dinero y los talentos como parte de la vida de fe. Plantea la mayordomía no como obligación, sino como una forma de vivir con propósito.",
  },
  "consejos-sobre-la-obra-de-escuela-sabatica": {
    title: "Consejos sobre la Obra de Escuela Sabática",
    format: "Tapa blanda, 148 x 210 mm",
    price: 7.69,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/consejos-sobre-la-obra-de-escuela-sabatica.jpg",
    description: "Dirigido a maestros y líderes de Escuela Sabática, ofrece orientación práctica para enseñar la Biblia de forma clara y relevante a todas las edades. Un recurso de referencia para quienes sirven en esa área de la iglesia.",
  },
  "consejos-para-los-maestros": {
    title: "Consejos para los Maestros",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.65,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/consejos-para-los-maestros.jpg",
    description: "Consejos prácticos sobre la vocación docente desde una perspectiva cristiana, con énfasis en la formación del carácter tanto como del intelecto. Útil para educadores en escuelas de la iglesia y también para padres.",
  },
  "consejos-para-la-iglesia": {
    title: "Consejos para la Iglesia",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.96,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/consejos-para-la-iglesia.jpg",
    description: "Una recopilación de consejos sobre la vida y la organización de la congregación local, pensada para líderes y miembros comprometidos con la salud espiritual de su iglesia.",
  },
  "cada-dia-con-dios": {
    title: "Cada Día con Dios",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.13,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/cada-dia-con-dios.jpg",
    description: "Un devocional diario, con una lectura breve para cada mañana del año, pensado para acompañar el tiempo personal de oración y estudio.",
  },
  "creencias-de-los-adventistas-del-septimo-dia": {
    title: "Creencias de los Adventistas del Séptimo Día",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.52,
    author: "Iglesia Adventista del Séptimo Día",
    category: "doctrina",
    categoryLabel: "Doctrina y creencias",
    cover: "img/creencias-de-los-adventistas-del-septimo-dia.jpg",
    description: "Una exposición clara de las doctrinas fundamentales de la Iglesia Adventista del Séptimo Día, pensada tanto para miembros como para quienes se acercan por primera vez a estas creencias.",
  },
  "alza-tus-ojos": {
    title: "Alza Tus Ojos",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.12,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/alza-tus-ojos.jpg",
    description: "Un devocional que invita a mirar más allá de las circunstancias diarias hacia la esperanza cristiana, con lecturas breves pensadas para el ánimo y la reflexión.",
  },
  "a-fin-de-conocerle": {
    title: "A Fin de Conocerle",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.20,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/a-fin-de-conocerle.jpg",
    description: "Un devocional centrado en el deseo de conocer más profundamente el carácter de Cristo a través de la lectura diaria y la meditación.",
  },
  "review-and-herald": {
    title: "Review and Herald",
    format: "Tapa dura, 155 x 235 mm",
    price: 15.74,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/review-and-herald.jpg",
    description: "Una recopilación de artículos publicados originalmente en la histórica revista Review and Herald, con reflexiones sobre la fe, la iglesia y la misión.",
  },
  "la-verdad-acerca-de-los-angeles": {
    title: "La Verdad Acerca de los Ángeles",
    format: "Tapa blanda, 148 x 210 mm",
    price: 7.90,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-verdad-acerca-de-los-angeles.jpg",
    description: "Reúne lo que la Biblia y los escritos de la autora enseñan sobre la existencia y la obra de los ángeles, su desempeño en la historia y en la vida del creyente hoy.",
  },
  "consejos-sobre-la-salud": {
    title: "Consejos sobre la Salud",
    format: "Tapa blanda, 148 x 210 mm",
    price: 11.64,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/consejos-sobre-la-salud.jpg",
    description: "Un compendio de principios sobre alimentación, ejercicio y estilo de vida saludable, entendidos como parte integral del bienestar espiritual. Es una óptima referencia dentro de la reforma pro salud.",
  },
  "la-historia-de-la-redencion": {
    title: "La Historia de la Redención",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.86,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-historia-de-la-redencion.jpg",
    description: "Un recorrido por el gran plan de salvación desde la caída hasta la restauración final, contado como una sola historia continua. Edición en tapa blanda con acabado brillo, pensada para el estudio personal y para regalar.",
  },
  "la-iglesia-remanente": {
    title: "La Iglesia Remanente",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.48,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-iglesia-remanente.jpg",
    description: "Una reflexión sobre la identidad y la misión del pueblo de Dios en el tiempo del fin, a partir de los escritos de la autora. Edición en tapa blanda con acabado brillo, ideal para el estudio personal.",
  },
  "la-maravillosa-gracia-de-dios": {
    title: "La Maravillosa Gracia de Dios",
    format: "Tapa blanda, 148 x 210 mm",
    price: 9.15,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-maravillosa-gracia-de-dios.jpg",
    description: "Un compendio devocional sobre la gracia de Dios y su obra en la vida del creyente, con lecturas breves pensadas para acompañar el día a día. Edición en tapa blanda con acabado brillo.",
  },
  "la-musica": {
    title: "La Música",
    format: "Tapa blanda, 148 x 210 mm",
    price: 6.44,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-musica.jpg",
    description: "Una recopilación de los escritos de la autora sobre el lugar de la música en el culto y en la vida cristiana. Edición en tapa blanda con acabado brillo, cuidada y de fácil lectura.",
  },
  "la-segunda-venida-y-el-cielo": {
    title: "La Segunda Venida y el Cielo",
    format: "Tapa blanda, 148 x 210 mm",
    price: 7.05,
    author: "Elena G. White",
    category: "elena-white",
    categoryLabel: "Elena G. White",
    cover: "img/la-segunda-venida-y-el-cielo.jpg",
    description: "Una mirada esperanzadora a las promesas de la Biblia sobre el regreso de Cristo y la vida eterna, explicadas con un lenguaje claro y devocional.",
  },
  "biblia-bilingue-rvr-nkjv-marron": {
    title: "Biblia Bilingüe RVR/NKJV, Marrón",
    format: "Tapa dura entelada, dos tonos",
    price: 38.99,
    freeShipping: true,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-bilingue-rvr-nkjv-marron.jpg",
    description: "Biblia bilingüe con el texto de la Reina Valera Revisada y la New King James Version en columnas, cubierta en dos tonos de marrón. Pensada tanto para el estudio comparado como para practicar inglés junto a la lectura bíblica.",
  },
  "biblia-compacta-fucsia-floral-cierre": {
    title: "Biblia Compacta Letra Grande, Fucsia Floral con Cremallera",
    format: "Tapa blanda, cierre de cremallera",
    price: 27.99,
    freeShipping: true,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-compacta-fucsia-floral-cierre.jpg",
    description: "Reina-Valera 1960 en formato compacto y letra grande (11 puntos), con cubierta floral en tono fucsia, cremallera e índice lateral. Ideal para llevar cada día.",
  },
  "biblia-apuntes-rosa-floreada": {
    title: "Biblia de Apuntes Tapa Dura Entelada, Rosa Floreada",
    format: "Tapa dura entelada, con banda elástica",
    price: 38.99,
    freeShipping: true,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-apuntes-rosa-floreada.jpg",
    description: "Reina-Valera 1960, letra de 8,5 puntos, en edición de apuntes: márgenes amplios para anotar, cubierta entelada floral en tono rosa y cierre con banda elástica.",
  },
  "biblia-apuntes-negro": {
    title: "Biblia de Apuntes Tapa Dura, Negro",
    format: "Tapa dura, con banda elástica",
    price: 38.04,
    freeShipping: true,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-apuntes-negro.jpg",
    description: "Reina-Valera 1960, letra de 8,5 puntos, en edición de apuntes: márgenes amplios para anotar, cubierta lisa en negro y cierre con banda elástica.",
  },
  "biblia-apuntes-negro-oro": {
    title: "Biblia de Apuntes Tapa Dura, Negro/Oro",
    format: "Tapa dura",
    price: 35.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de apuntes con márgenes amplios para anotar, cubierta en negro con detalles dorados.",
  },
  "biblia-apuntes-blanco-negro-floral": {
    title: "Biblia de Apuntes Tapa Dura, Blanco/Negro Floral",
    format: "Tapa dura",
    price: 34.24,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de apuntes con márgenes amplios para anotar, cubierta floral en blanco y negro.",
  },
  "biblia-apuntes-azul-oscuro-floral": {
    title: "Biblia de Apuntes Tapa Dura, Azul Oscuro Floral",
    format: "Tapa dura",
    price: 34.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de apuntes con márgenes amplios para anotar, cubierta floral en azul oscuro.",
  },
  "biblia-apuntes-azul-celeste-floral": {
    title: "Biblia de Apuntes Tapa Dura, Azul Celeste Floral",
    format: "Tapa dura",
    price: 34.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de apuntes con márgenes amplios para anotar, cubierta floral en azul celeste.",
  },
  "biblia-apuntes-rosa-floral": {
    title: "Biblia de Apuntes Tapa Dura, Rosa Floral",
    format: "Tapa dura",
    price: 34.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de apuntes con márgenes amplios para anotar, cubierta floral en tono rosa.",
  },
  "biblia-apuntes-vino-tinto": {
    title: "Biblia de Apuntes Tapa Dura, Vino Tinto",
    format: "Tapa dura",
    price: 34.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de apuntes con márgenes amplios para anotar, cubierta lisa en vino tinto.",
  },
  "biblia-rvr60-cafe": {
    title: "Biblia RVR60 Letra Grande, Café",
    format: "Tapa dura, imitación piel",
    price: 15.24,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-cafe.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Canto dorado. Cubierta en imitación piel dos tonos grabada, color café.",
  },
  "biblia-rvr60-verde-mariposas": {
    title: "Biblia RVR60 Letra Grande, Verde Mariposas",
    format: "Tapa dura, imitación piel",
    price: 15.24,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-verde-mariposas.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Canto dorado. Cubierta en tono verde menta con motivo de mariposas.",
  },
  "biblia-rvr60-negro": {
    title: "Biblia RVR60 Letra Grande, Negro",
    format: "Tapa dura, imitación piel",
    price: 16.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-negro.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Incluye introducciones y abreviaturas de C.H. Spurgeon y J.C. Ryle, y concordancia de 120 páginas. Cubierta negra con canto dorado.",
  },
  "biblia-rvr60-marron": {
    title: "Biblia RVR60 Letra Grande, Marrón",
    format: "Tapa dura, imitación piel",
    price: 16.2,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-marron.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Incluye introducciones y abreviaturas de C.H. Spurgeon y J.C. Ryle, y concordancia de 120 páginas. Cubierta marrón dos tonos con canto dorado.",
  },
  "biblia-rvr60-beige": {
    title: "Biblia RVR60 Letra Grande, Beige",
    format: "Tapa dura, imitación piel",
    price: 15.24,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Incluye introducciones y abreviaturas de C.H. Spurgeon y J.C. Ryle, y concordancia de 120 páginas. Cubierta en tono beige.",
  },
  "biblia-rvr60-amarillo-abejas-cierre": {
    title: "Biblia RVR60 Letra Grande, Amarillo Abejas, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-amarillo-abejas-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta amarilla con motivo de panal y abejas.",
  },
  "biblia-rvr60-verde-olivo-cierre": {
    title: "Biblia RVR60 Letra Grande, Verde Olivo, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-verde-olivo-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta en tono verde olivo con motivo vegetal.",
  },
  "biblia-rvr60-marron-elegante-cierre": {
    title: "Biblia RVR60 Letra Grande, Marrón Elegante, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-marron-elegante-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta en dos tonos de marrón.",
  },
  "biblia-rvr60-cafe-cierre": {
    title: "Biblia RVR60 Letra Grande, Café, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-cafe-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta café con bordes ornamentales grabados.",
  },
  "biblia-rvr60-beige-floral-cierre": {
    title: "Biblia RVR60 Letra Grande, Beige Floral, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-beige-floral-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera y canto de color. Cubierta beige con motivo de hojas grabado, imitación piel de alta calidad.",
  },
  "biblia-rvr60-morado-flor-dorada-cierre": {
    title: "Biblia RVR60 Letra Grande, Morado con Flor Dorada, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-morado-flor-dorada-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta morada con motivo floral en dorado y negro.",
  },
  "biblia-rvr60-rosa-floral-cierre": {
    title: "Biblia RVR60 Letra Grande, Rosa Floral, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/portada-proximamente.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta rosa con motivo floral.",
  },
  "biblia-rvr60-negro-cierre": {
    title: "Biblia RVR60 Letra Grande, Negro, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-negro-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta negra con textura geométrica grabada.",
  },
  "biblia-rvr60-aguila-cierre": {
    title: "Biblia RVR60 Letra Grande, Águila, con Cierre",
    format: "Tapa dura, con cierre de cremallera",
    price: 19.99,
    author: "Sociedades Bíblicas Unidas",
    category: "biblias",
    categoryLabel: "Biblias",
    cover: "img/biblia-rvr60-aguila-cierre.jpg",
    description: "Reina-Valera 1960, edición de letra grande (11,5 puntos), tamaño manual (22 x 15 x 3 cm). Incluye palabras de Jesús en rojo, concordancia amplia, concordancia de personajes bíblicos, referencias cruzadas y 32 páginas a todo color con ayudas de estudio: versículos clave de cada libro, genealogía de Jesús, fiestas bíblicas, plano del templo, cronología de reyes y profetas, parábolas y milagros de Jesús, plan de salvación, promesas de Dios, plan de lectura en un año y 12 mapas a todo color. Con cierre de cremallera. Cubierta marrón grabada con un águila y el texto de Isaías 40:31.",
  }
};

const MAX_ITEMS = 30;
const MAX_QTY = 20;
const SHIPPING_COST = 6;

function textoValido(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
}

exports.crearPedido = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para completar la compra.");
  }

  const data = request.data || {};
  const itemsSolicitados = Array.isArray(data.items) ? data.items : [];
  const envio = data.envio || {};

  if (itemsSolicitados.length === 0) {
    throw new HttpsError("invalid-argument", "El carrito está vacío.");
  }
  if (itemsSolicitados.length > MAX_ITEMS) {
    throw new HttpsError("invalid-argument", "Hay demasiados artículos distintos en el pedido.");
  }
  if (
    !textoValido(envio.nombre, 120) ||
    !textoValido(envio.direccion, 200) ||
    !textoValido(envio.ciudad, 120) ||
    !textoValido(envio.cp, 20) ||
    !textoValido(envio.telefono, 40)
  ) {
    throw new HttpsError("invalid-argument", "Faltan datos de envío, o son demasiado largos.");
  }

  // Recalcula CADA artículo contra el catálogo de arriba: precio, título
  // y formato siempre vienen de aquí, nunca de lo que mande el navegador.
  const itemsFinales = [];
  for (const item of itemsSolicitados) {
    const libro = item && CATALOGO[item.id];
    if (!libro) {
      throw new HttpsError("invalid-argument", "Uno de los libros del pedido ya no existe en el catálogo.");
    }
    const cantidad = Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1));
    itemsFinales.push({
      id: item.id,
      titulo: libro.title,
      formato: libro.format,
      precio: libro.price,
      cantidad: cantidad,
      envioGratis: !!libro.freeShipping,
    });
  }

  const subtotal = itemsFinales.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
  // Envío gratis solo si TODOS los libros del pedido lo llevan incluido
  // (mismo criterio que en js/cart.js); si no, se cobran los 6€ habituales.
  const todosEnvioGratis = itemsFinales.every((it) => it.envioGratis);
  const gastosEnvio = todosEnvioGratis ? 0 : SHIPPING_COST;
  const subtotalRedondeado = Math.round(subtotal * 100) / 100;
  const total = Math.round((subtotal + gastosEnvio) * 100) / 100;

  // Nombre y correo del cliente: se leen de la cuenta autenticada, no del
  // formulario, para que nadie pueda hacerse pasar por otra persona.
  const usuario = await admin.auth().getUser(auth.uid);
  const numero = "LT-" + Date.now().toString().slice(-6);

  const pedido = {
    numero,
    uid: auth.uid,
    clienteNombre: usuario.displayName || envio.nombre.trim(),
    clienteEmail: usuario.email || "",
    envio: {
      nombre: envio.nombre.trim(),
      direccion: envio.direccion.trim(),
      ciudad: envio.ciudad.trim(),
      cp: envio.cp.trim(),
      telefono: envio.telefono.trim(),
    },
    items: itemsFinales,
    subtotal: subtotalRedondeado,
    gastosEnvio,
    total,
    estado: "pendiente",
    // "pagado" es independiente de "estado" (que refleja el envío del
    // pedido, no el cobro). Empieza en false y solo lo cambia a true el
    // webhook de Stripe, cuando el pago se ha confirmado de verdad.
    pagado: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("pedidos").add(pedido);

  // Devolvemos al navegador el pedido ya calculado por el servidor, para
  // que pueda mostrar la confirmación y enviar los correos con estos
  // datos reales (no con los que él mismo había propuesto).
  return {
    id: ref.id,
    numero: pedido.numero,
    items: pedido.items,
    subtotal: pedido.subtotal,
    gastosEnvio: pedido.gastosEnvio,
    total: pedido.total,
    clienteNombre: pedido.clienteNombre,
    clienteEmail: pedido.clienteEmail,
    envio: pedido.envio,
  };
});

// ==========================================================================
// "crearIntentPago" — crea un PaymentIntent en Stripe para procesar
// el cobro nativo dentro de la propia web mediante Stripe Elements.
// ==========================================================================
exports.crearIntentPago = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para pagar.");
  }

  const pedidoId = request.data && request.data.pedidoId;
  if (!pedidoId || typeof pedidoId !== "string") {
    throw new HttpsError("invalid-argument", "Falta el identificador del pedido.");
  }

  const ref = db.collection("pedidos").doc(pedidoId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Ese pedido no existe.");
  }
  const pedido = snap.data();

  if (pedido.uid !== auth.uid) {
    throw new HttpsError("permission-denied", "Este pedido no te pertenece.");
  }
  if (pedido.pagado) {
    throw new HttpsError("failed-precondition", "Este pedido ya está pagado.");
  }

  const stripe = require("stripe")(STRIPE_SECRET_KEY.value().trim());

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pedido.total * 100), // Importe en céntimos
      currency: "eur",
      receipt_email: pedido.clienteEmail || undefined,
      metadata: { pedidoId: pedidoId },
      automatic_payment_methods: { enabled: true },
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (err) {
    console.error("STRIPE ERROR al crear PaymentIntent:", err.type || "", err.message || err);
    throw new HttpsError("internal", "No se pudo iniciar el proceso de pago seguro.");
  }
});

// ==========================================================================
// "crearSesionPago" — a partir de un pedido ya creado (por "crearPedido"),
// abre una sesión de pago redireccionada en Stripe Checkout. Se conserva
// por compatibilidad con métodos de pago externos si los necesitas.
// ==========================================================================
exports.crearSesionPago = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para pagar.");
  }

  const pedidoId = request.data && request.data.pedidoId;
  if (!pedidoId || typeof pedidoId !== "string") {
    throw new HttpsError("invalid-argument", "Falta el identificador del pedido.");
  }

  const ref = db.collection("pedidos").doc(pedidoId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Ese pedido no existe.");
  }
  const pedido = snap.data();

  if (pedido.uid !== auth.uid) {
    throw new HttpsError("permission-denied", "Este pedido no te pertenece.");
  }
  if (pedido.pagado) {
    throw new HttpsError("failed-precondition", "Este pedido ya está pagado.");
  }

  const stripe = require("stripe")(STRIPE_SECRET_KEY.value().trim());

  const lineItems = (pedido.items || []).map(function (it) {
    return {
      price_data: {
        currency: "eur",
        unit_amount: Math.round(it.precio * 100),
        product_data: { name: it.titulo + (it.formato ? " (" + it.formato + ")" : "") },
      },
      quantity: it.cantidad,
    };
  });

  if (pedido.gastosEnvio) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: Math.round(pedido.gastosEnvio * 100),
        product_data: { name: "Gastos de envío" },
      },
      quantity: 1,
    });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: pedido.clienteEmail || undefined,
      client_reference_id: pedidoId,
      metadata: { pedidoId: pedidoId },
      success_url: SITE_URL + "/carrito.html?pago=exito&pedido=" + encodeURIComponent(pedidoId) + "&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: SITE_URL + "/carrito.html?pago=cancelado&pedido=" + encodeURIComponent(pedidoId),
    });
  } catch (err) {
    console.error("STRIPE ERROR al crear la sesión de pago:", err.type || "", err.message || err);
    throw new HttpsError("internal", "Stripe no ha podido abrir el pago (" + (err.type || "error desconocido") + "). Revisa la clave de Stripe.");
  }

  return { url: session.url };
});

// ==========================================================================
// "stripeWebhook" — Stripe llama aquí cuando un pago se completa de verdad.
// Es la ÚNICA forma en que un pedido pasa a "pagado": nunca se fía de lo
// que diga el navegador (el navegador podría "fingir" haber pagado).
// ==========================================================================
exports.stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = require("stripe")(STRIPE_SECRET_KEY.value());

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET.value());
  } catch (err) {
    console.error("Firma de webhook de Stripe inválida:", err.message);
    res.status(400).send("Firma inválida");
    return;
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const object = event.data.object;
    const pedidoId = object.metadata && object.metadata.pedidoId;
    if (pedidoId) {
      try {
        await db.collection("pedidos").doc(pedidoId).update({
          pagado: true,
          pagoConfirmadoEn: admin.firestore.FieldValue.serverTimestamp(),
          stripePaymentId: object.id,
        });
      } catch (err) {
        console.error("No se pudo marcar el pedido " + pedidoId + " como pagado:", err);
      }
    }
  }

  res.status(200).send("ok");
});

// ==========================================================================
// "productoMeta" — sirve la ficha de producto con metadatos pre-renderizados
// ==========================================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

exports.productoMeta = onRequest(async (req, res) => {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const libro = CATALOGO[id];

  let html;
  try {
    const respuesta = await fetch(SITE_URL + "/producto-app.html");
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    html = await respuesta.text();
  } catch (err) {
    res.redirect(302, "/producto-app.html" + (id ? "?id=" + encodeURIComponent(id) : ""));
    return;
  }

  if (libro) {
    const pageTitle = libro.title + " — Librería tu mayor tesoro";
    const desc = libro.description.slice(0, 155);
    const url = SITE_URL + "/producto.html?id=" + id;
    const image = SITE_URL + "/" + libro.cover;

    html = html
      .replace(/(<title id="pageTitle">)[^<]*(<\/title>)/, "$1" + escapeHtml(pageTitle) + "$2")
      .replace(/(id="metaDescription"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(desc) + "$2")
      .replace(/(id="canonicalLink"[^>]*href=")[^"]*(")/, "$1" + url + "$2")
      .replace(/(id="ogTitle"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(pageTitle) + "$2")
      .replace(/(id="ogDescription"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(desc) + "$2")
      .replace(/(id="ogUrl"[^>]*content=")[^"]*(")/, "$1" + url + "$2")
      .replace(/(id="ogImage"[^>]*content=")[^"]*(")/, "$1" + image + "$2")
      .replace(/(id="twitterTitle"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(pageTitle) + "$2")
      .replace(/(id="twitterDescription"[^>]*content=")[^"]*(")/, "$1" + escapeHtml(desc) + "$2")
      .replace(/(id="twitterImage"[^>]*content=")[^"]*(")/, "$1" + image + "$2");

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: libro.title,
      image: image,
      description: libro.description,
      brand: { "@type": "Brand", name: libro.author },
      offers: {
        "@type": "Offer",
        url: url,
        priceCurrency: "EUR",
        price: String(libro.price),
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "Librería tu mayor tesoro" },
      },
    };
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: libro.categoryLabel, item: SITE_URL + "/categoria.html?cat=" + libro.category },
        { "@type": "ListItem", position: 3, name: libro.title, item: url },
      ],
    };
    const bloqueJsonLd =
      '<script type="application/ld+json">' + JSON.stringify(jsonLd) + "</script>\n" +
      '<script type="application/ld+json">' + JSON.stringify(breadcrumbLd) + "</script>\n</head>";
    html = html.replace("</head>", bloqueJsonLd);
  }

  res.set("Content-Type", "text/html; charset=UTF-8");
  res.set("Cache-Control", "public, max-age=600, s-maxage=3600");
  res.status(200).send(html);
});