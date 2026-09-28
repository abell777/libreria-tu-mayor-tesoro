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
    { termino: 'Vida eterna', def: 'No solo una vida que dura siempre, sino una calidad de vida distinta que empieza ya en la relación con Dios.', libro: 'la-unica-esperanza' },
    { termino: 'Abominación desoladora', def: 'Expresión de Daniel que Jesús retomó al hablar de la destrucción de Jerusalén (Mateo 24:15). Se refiere a un poder que profana lo sagrado y provoca desolación.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Alma', def: 'En la Biblia, la persona entera con su vida, no una parte inmortal separada del cuerpo. Es la enseñanza que sostiene la visión adventista sobre la muerte y la resurrección.', libro: 'la-unica-esperanza' },
    { termino: 'Anciano de iglesia', def: 'Miembro elegido por la congregación para cuidar de la vida espiritual de la iglesia local, acompañar al pastor y visitar a los miembros.', libro: 'consejos-para-la-iglesia' },
    { termino: 'Ángeles', def: 'Seres creados por Dios, superiores al ser humano en poder, que sirven como mensajeros y protectores de quienes heredan la salvación (Hebreos 1:14).', libro: 'la-verdad-acerca-de-los-angeles' },
    { termino: 'Anticristo', def: 'Palabra que aparece en las cartas de Juan para designar a quien se opone a Cristo o pretende ocupar su lugar. En la interpretación profética histórica se aplica a un poder religioso concreto y no a una sola persona.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Antiguo Testamento', def: 'La primera parte de la Biblia, con 39 libros escritos antes de Cristo: la creación, la ley, la historia de Israel, la poesía y los profetas.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Apóstol', def: 'Palabra griega que significa «enviado». Nombra a los doce que Jesús escogió y, por extensión, a quienes fueron enviados a llevar el evangelio como Pablo.', libro: 'los-hechos-de-los-apostoles' },
    { termino: 'Armagedón', def: 'Lugar simbólico que menciona Apocalipsis 16:16 como escenario de la batalla final entre el bien y el mal antes del regreso de Cristo.', libro: 'eventos-de-los-ultimos-dias' },
    { termino: 'Ayuno', def: 'Abstenerse de comer, total o parcialmente, durante un tiempo para dedicarse con más atención a la oración y a buscar a Dios. Es una práctica que aparece en toda la Biblia.', libro: 'la-oracion' },
    { termino: 'Babilonia', def: 'Ciudad que esclavizó a Israel y símbolo, en el Apocalipsis, de la confusión religiosa y de la oposición a Dios a lo largo de la historia.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Bienaventuranzas', def: 'Las declaraciones de felicidad con las que Jesús abre el Sermón del Monte («bienaventurados los de limpio corazón…»). Describen el carácter de quienes forman parte de su reino.', libro: 'discurso-maestro-de-jesucristo' },
    { termino: 'Biblia bilingüe', def: 'Edición que presenta el texto bíblico en dos idiomas, en columnas o páginas enfrentadas. Es muy útil para quien estudia otro idioma o compara traducciones.', libro: 'biblia-bilingue-rvr-nkjv-marron' },
    { termino: 'Biblia de apuntes', def: 'Edición con márgenes anchos o espacio en blanco para escribir notas, subrayar y anotar ideas mientras se estudia.', libro: 'biblia-apuntes-negro' },
    { termino: 'Biblia de letra grande', def: 'Edición con tipografía ampliada, pensada para facilitar la lectura a personas con vista cansada o para quienes prefieren leer sin esfuerzo.', libro: 'biblia-rvr60-negro' },
    { termino: 'Canon bíblico', def: 'La lista de libros reconocidos como inspirados que forman la Biblia. La palabra griega «canon» significa «regla» o «medida».', libro: 'mensajes-selectos-tomo-i' },
    { termino: 'Carácter', def: 'El conjunto de hábitos, pensamientos y decisiones que forman a una persona por dentro. Para la Biblia, es lo único que llevaremos con nosotros más allá de esta vida.', libro: 'edificacion-del-caracter' },
    { termino: 'Cena del Señor', def: 'Ceremonia de la iglesia cristiana con pan y vino (o jugo de uva) que recuerda la muerte de Jesús. Se acompaña en muchas iglesias del lavamiento de los pies.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Cielo', def: 'La morada de Dios y, en la esperanza cristiana, el lugar preparado para los redimidos. Las Escrituras terminan hablando de un cielo nuevo y una tierra nueva.', libro: 'la-segunda-venida-y-el-cielo' },
    { termino: 'Cierre de la gracia', def: 'Momento, antes del regreso de Cristo, en el que termina el tiempo para decidirse por la salvación y cada persona queda fijada en su elección.', libro: 'eventos-de-los-ultimos-dias' },
    { termino: 'Concordancia bíblica', def: 'Índice alfabético de las palabras de la Biblia con los versículos en los que aparecen. Es una herramienta clásica para estudiar un tema.', libro: 'biblia-apuntes-negro' },
    { termino: 'Conflicto de los siglos', def: 'La idea de que la historia humana se desarrolla dentro de una gran batalla entre Cristo y Satanás sobre el carácter de Dios. Es el hilo conductor de la serie de cinco libros de Elena G. White.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Conversión', def: 'Cambio profundo que Dios produce en una persona: se aparta de su vida anterior y se vuelve hacia Él. Empieza con un acto y continúa como un proceso.', libro: 'el-camino-a-cristo' },
    { termino: 'Creación', def: 'El acto por el cual Dios trajo a la existencia el universo y la vida. El relato de Génesis 1 y 2 es la base de la fe en un Dios personal que cuida de lo que hizo.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Cristo', def: 'Título que significa «ungido» (Mesías). Designa a Jesús de Nazaret como el enviado de Dios para salvar. Para el cristiano es a la vez Dios y hombre.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Culto familiar', def: 'Momento breve de lectura bíblica, oración y canto que la familia comparte en casa, normalmente por la mañana o al caer la tarde.', libro: 'el-hogar-cristiano' },
    { termino: 'Daniel', def: 'Profeta que vivió en el exilio babilónico. Su libro contiene relatos de fidelidad y profecías, como las de los imperios y los 2300 días, en las que se apoya buena parte del mensaje adventista.', libro: 'profetas-y-reyes' },
    { termino: 'Diablo', def: 'Nombre bíblico del ángel que se rebeló contra Dios. La palabra griega significa «acusador». La Biblia lo presenta como un ser real y no como una simple metáfora del mal.', libro: 'la-verdad-acerca-de-los-angeles' },
    { termino: 'Día de la Expiación', def: 'Fiesta anual israelita en la que el sumo sacerdote entraba al lugar santísimo para purificar el santuario. Prefigura la obra final de Cristo.', libro: 'cristo-en-su-santuario' },
    { termino: 'Diezmo', def: 'La décima parte de los ingresos, que en la Biblia se devuelve a Dios como reconocimiento de que todo procede de Él y para sostener la obra de la iglesia.', libro: 'consejos-sobre-la-mayordomia-cristiana' },
    { termino: 'Discípulo', def: 'Aprendiz que sigue a un maestro. En el Nuevo Testamento, quien sigue a Jesús aprende de Él y vive como Él vivió.', libro: 'palabras-de-vida-del-gran-maestro' },
    { termino: 'Doctrina', def: 'Enseñanza fundamental de una fe. La palabra viene del latín «doctrina» (enseñanza) y designa lo que una iglesia cree sobre Dios, el ser humano y la salvación.', libro: 'creencias-de-los-adventistas-del-septimo-dia' },
    { termino: 'Educación integral', def: 'Enfoque que busca desarrollar a la vez la mente, el cuerpo y el espíritu, y no solo transmitir conocimientos. Es la idea central de los escritos sobre educación de Elena G. White.', libro: 'la-educacion' },
    { termino: 'Elena G. White', def: 'Escritora cristiana estadounidense (1827-1915), cofundadora de la Iglesia Adventista del Séptimo Día. Sus escritos tratan de la vida de Cristo, la salud, la educación, la familia y la profecía.', libro: 'el-camino-a-cristo' },
    { termino: 'Elías', def: 'Profeta del reino del norte de Israel que se enfrentó a la idolatría en el monte Carmelo. En Malaquías se anuncia un mensaje «con el espíritu de Elías» antes del regreso de Cristo.', libro: 'profetas-y-reyes' },
    { termino: 'Encarnación', def: 'El hecho de que Dios, en la persona de Jesucristo, se hizo ser humano. Es la afirmación central de Juan 1:14: «el Verbo se hizo carne».', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Espíritu Santo', def: 'La tercera persona de la Trinidad. Convence del pecado, guía a la verdad, transforma el carácter y da fuerza para el servicio.', libro: 'los-hechos-de-los-apostoles' },
    { termino: 'Estado de los muertos', def: 'Lo que la Biblia enseña sobre la muerte. En la visión adventista, los muertos «duermen» sin conciencia hasta la resurrección, en la que esperan la vida eterna.', libro: 'la-unica-esperanza' },
    { termino: 'Evangelios', def: 'Los cuatro relatos de la vida, muerte y resurrección de Jesús: Mateo, Marcos, Lucas y Juan.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Éxodo', def: 'Salida del pueblo de Israel de la esclavitud en Egipto guiado por Moisés. Es el gran relato de liberación del Antiguo Testamento.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Fe', def: 'Confianza en Dios y en lo que Él ha dicho, no solo aceptar unas ideas. La Biblia la describe como la mano con la que recibimos el regalo de la salvación.', libro: 'fe-y-obras' },
    { termino: 'Fruto del Espíritu', def: 'El carácter que produce el Espíritu Santo en el creyente. Gálatas 5:22 lo resume así: amor, gozo, paz, paciencia, benignidad, bondad, fe, mansedumbre y templanza.', libro: 'edificacion-del-caracter' },
    { termino: 'Génesis', def: 'Primer libro de la Biblia. Habla de los orígenes: la creación, la caída, el diluvio y las historias de Abraham, Isaac, Jacob y José.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Getsemaní', def: 'Huerto al pie del monte de los Olivos donde Jesús oró la noche antes de su crucifixión y fue arrestado.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Gran chasco', def: 'Nombre con el que se conoce la decepción de los seguidores de William Miller, que esperaban el regreso de Cristo el 22 de octubre de 1844. De ese grupo surgió más tarde el movimiento adventista.', libro: 'primeros-escritos' },
    { termino: 'Gran comisión', def: 'El mandato final de Jesús a sus discípulos: ir por todo el mundo, hacer discípulos, bautizarlos y enseñarles (Mateo 28:19-20).', libro: 'el-evangelismo' },
    { termino: 'Gran tribulación', def: 'Época de aflicción anunciada por Jesús en Mateo 24. Se aplica a la persecución del pasado y a un tiempo de dificultad final antes de su venida.', libro: 'el-conflicto-inminente' },
    { termino: 'Hidroterapia', def: 'Uso del agua (baños, compresas, fomentos) con fines terapéuticos. Elena G. White la incluye entre los remedios naturales.', libro: 'el-ministerio-de-curacion' },
    { termino: 'Hogar cristiano', def: 'La familia como primera escuela de fe: un hogar donde se ora, se lee la Biblia y se cultivan el respeto y el amor mutuo.', libro: 'el-hogar-cristiano' },
    { termino: 'Idolatría', def: 'Poner a alguien o algo en el lugar que le corresponde solo a Dios. Puede ser una imagen, pero también el dinero, el poder o uno mismo.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Infierno', def: 'Término que en la Biblia traduce varias palabras. En la interpretación adventista, el fuego final destruye definitivamente el pecado y a quienes lo rechazan, en lugar de torturarlos para siempre.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Israel', def: 'Nombre que Dios dio a Jacob y luego al pueblo que descendió de él. En el Nuevo Testamento se extiende, en sentido espiritual, a todos los que creen en Cristo.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Jesús', def: 'Nombre hebreo que significa «Jehová salva». Nació en Belén, vivió en Nazaret, murió en la cruz y resucitó al tercer día.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Juan el Bautista', def: 'Profeta que preparó el camino de Jesús predicando arrepentimiento y bautizando en el Jordán. Fue el precursor anunciado por Isaías y Malaquías.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Lavamiento de los pies', def: 'Rito que Jesús instituyó la noche de la última cena (Juan 13) como expresión de humildad y servicio. Algunas iglesias, como la adventista, lo practican antes de la Cena del Señor.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Liderazgo cristiano', def: 'Dirigir a otros con el estilo de Jesús: sirviendo, escuchando y dando ejemplo, en lugar de mandar o imponer.', libro: 'liderazgo-cristiano' },
    { termino: 'Lluvia tardía', def: 'Imagen tomada de la agricultura de Israel: la lluvia de primavera que madura la cosecha. Se usa para hablar de un derramamiento especial del Espíritu Santo antes del regreso de Cristo.', libro: 'eventos-de-los-ultimos-dias' },
    { termino: 'Marca de la bestia', def: 'Símbolo de Apocalipsis 13 y 14 que identifica a quienes adoran a la bestia en lugar de a Dios. En la interpretación adventista, el conflicto final se centra en a quién se obedece.', libro: 'el-conflicto-inminente' },
    { termino: 'Matrimonio', def: 'Unión de un hombre y una mujer que Dios instituyó en el Edén. La Biblia lo describe como un compromiso de por vida y como imagen del amor de Cristo por su iglesia.', libro: 'el-hogar-cristiano' },
    { termino: 'Mediador', def: 'Quien se pone entre dos partes para reconciliarlas. La Biblia enseña que hay un solo mediador entre Dios y los hombres: Jesucristo (1 Timoteo 2:5).', libro: 'cristo-en-su-santuario' },
    { termino: 'Mesías', def: 'Palabra hebrea que significa «ungido». Era el libertador prometido en las Escrituras hebreas. Los cristianos creen que es Jesús.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Miller, William', def: 'Predicador bautista estadounidense (1782-1849) que estudió las profecías de Daniel y anunció que Cristo volvería alrededor de 1844. Su movimiento dio origen al adventismo.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Ministerio', def: 'En la Biblia, servicio. Todo creyente participa del ministerio de la iglesia, aunque algunos lo ejercen como oficio, como pastores, ancianos o diáconos.', libro: 'el-ministerio-pastoral' },
    { termino: 'Ministerio de la bondad', def: 'Ayudar a otros con actos concretos de amabilidad y compasión, como hizo Jesús, como puerta para compartir después el mensaje del evangelio.', libro: 'el-ministerio-de-la-bondad' },
    { termino: 'Ministerio médico misionero', def: 'Servicio que une el cuidado de la salud con la predicación del evangelio. Cristo curaba y enseñaba, y esa es la pauta que se propone a la iglesia.', libro: 'el-ministerio-medico' },
    { termino: 'Moisés', def: 'Profeta y libertador de Israel. Sacó al pueblo de Egipto, recibió la ley en el Sinaí y escribió los cinco primeros libros de la Biblia.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Música sacra', def: 'La música dedicada a la adoración. La Biblia recoge cánticos desde el Éxodo y los salmos hasta el Apocalipsis, y le da un papel central en el culto.', libro: 'la-musica' },
    { termino: 'Naturaleza', def: 'La creación como libro abierto en el que Dios se revela. Los escritos sobre salud y educación la presentan como una fuente de descanso, aprendizaje y curación.', libro: 'de-la-ciudad-al-campo' },
    { termino: 'Nueva tierra', def: 'La tierra renovada donde, según Apocalipsis 21, habitarán los redimidos con Dios, sin dolor ni muerte.', libro: 'la-segunda-venida-y-el-cielo' },
    { termino: 'Nuevo Testamento', def: 'La segunda parte de la Biblia, con 27 libros: los cuatro evangelios, Hechos, las cartas de los apóstoles y el Apocalipsis.', libro: 'los-hechos-de-los-apostoles' },
    { termino: 'Obrero bíblico', def: 'Persona que se dedica a dar estudios bíblicos y a visitar a quienes desean conocer más de la Palabra de Dios.', libro: 'obreros-evangelicos' },
    { termino: 'Ocho remedios naturales', def: 'Los recursos sencillos que se recomiendan para la salud: aire puro, luz solar, abstinencia de lo dañino, descanso, ejercicio, alimentación adecuada, agua y confianza en Dios.', libro: 'el-ministerio-de-curacion' },
    { termino: 'Oración', def: 'Hablar con Dios como se habla con un amigo. Incluye alabanza, gratitud, confesión y petición, y también escuchar.', libro: 'la-oracion' },
    { termino: 'Pacto', def: 'Acuerdo solemne por el que Dios se compromete con su pueblo. La Biblia habla del pacto con Abraham, del pacto en el Sinaí y del nuevo pacto sellado con la sangre de Cristo.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Parábola', def: 'Relato breve tomado de la vida diaria con el que Jesús enseñaba verdades espirituales. Por ejemplo, el hijo pródigo, el sembrador o el buen samaritano.', libro: 'palabras-de-vida-del-gran-maestro' },
    { termino: 'Pascua', def: 'Fiesta israelita que recuerda la liberación de Egipto. Cristo murió en la Pascua y el Nuevo Testamento lo presenta como el verdadero Cordero.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Pastor', def: 'Quien cuida de la iglesia como un pastor cuida de sus ovejas. Es también una imagen que Jesús aplicó a sí mismo: «yo soy el buen pastor».', libro: 'el-ministerio-pastoral' },
    { termino: 'Patriarca', def: 'Cabeza de familia de los primeros tiempos bíblicos. Se aplica sobre todo a Abraham, Isaac y Jacob, y a los hijos de Jacob.', libro: 'historia-de-los-patriarcas-y-profetas' },
    { termino: 'Pecado', def: 'En la Biblia, romper la ley de Dios y separarse de Él (1 Juan 3:4). No es solo una falta concreta, sino una condición de la que Cristo viene a liberarnos.', libro: 'el-camino-a-cristo' },
    { termino: 'Pentecostés', def: 'Fiesta judía que, tras la ascensión de Jesús, fue el momento en que el Espíritu Santo descendió sobre los discípulos (Hechos 2) y nació la iglesia cristiana.', libro: 'los-hechos-de-los-apostoles' },
    { termino: 'Perdón', def: 'Dios borra la culpa de quien se arrepiente y se vuelve a Él. Jesús enseñó que quien ha sido perdonado debe perdonar también.', libro: 'el-camino-a-cristo' },
    { termino: 'Profecía', def: 'Mensaje que Dios comunica a través de un profeta. Puede anunciar el futuro, pero sobre todo llama a volver a Dios y a vivir conforme a su voluntad.', libro: 'primeros-escritos' },
    { termino: 'Profeta', def: 'Portavoz de Dios: persona que transmite lo que Él quiere decir a su pueblo. La Biblia menciona muchos, desde Moisés hasta Juan el Bautista.', libro: 'profetas-y-reyes' },
    { termino: 'Reavivamiento', def: 'Despertar espiritual en el que una persona o una comunidad renueva su relación con Dios. Suele ir de la mano de la oración, el estudio de la Biblia y la reforma de vida.', libro: 'reavivamientos-modernos' },
    { termino: 'Redención', def: 'Rescate mediante un pago. En la Biblia describe lo que Cristo hizo por nosotros al entregar su vida para liberarnos del pecado.', libro: 'la-historia-de-la-redencion' },
    { termino: 'Reforma protestante', def: 'Movimiento religioso del siglo XVI que buscó volver a la autoridad de la Biblia. Lo iniciaron figuras como Lutero, Calvino y Zuinglio.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Régimen alimenticio', def: 'Forma de alimentarse que cuida la salud. Los escritos adventistas recomiendan una dieta sencilla, basada en cereales, frutas, frutos secos y verduras, y sin carne.', libro: 'leyes-sobre-el-regimen-alimenticio' },
    { termino: 'Reino de Dios', def: 'El gobierno de Dios sobre quienes lo aceptan. Jesús anunció que ya está entre nosotros y que se manifestará plenamente a su regreso.', libro: 'discurso-maestro-de-jesucristo' },
    { termino: 'Reposo sabático', def: 'El descanso que Dios ofrece cada sábado y, en sentido más amplio, la paz que se encuentra al confiar en Él en lugar de en los propios esfuerzos.', libro: 'el-deseado-de-todas-las-gentes' },
    { termino: 'Sacerdote', def: 'En el Antiguo Testamento, quien ofrecía sacrificios y servía en el santuario en nombre del pueblo. En el Nuevo se dice que Cristo es nuestro sumo sacerdote.', libro: 'cristo-en-su-santuario' },
    { termino: 'Sacrificio', def: 'Ofrenda que se entregaba a Dios en el santuario. Los sacrificios de animales señalaban hacia la muerte de Cristo, el Cordero de Dios.', libro: 'cristo-en-su-santuario' },
    { termino: 'Salmos', def: 'Colección de 150 poemas y cánticos que expresan adoración, queja, gratitud y esperanza. Han sido el libro de oración de judíos y cristianos durante siglos.', libro: 'la-musica' },
    { termino: 'Satanás', def: 'Nombre hebreo del adversario, que significa «el que acusa». La Biblia lo identifica con el ángel caído que engañó a Adán y Eva y que se opone a Dios.', libro: 'la-verdad-acerca-de-los-angeles' },
    { termino: 'Sello de Dios', def: 'Símbolo de Apocalipsis 7 que marca a los fieles. La interpretación adventista lo relaciona con un carácter transformado y con la observancia del sábado.', libro: 'eventos-de-los-ultimos-dias' },
    { termino: 'Sermón del Monte', def: 'El discurso más conocido de Jesús (Mateo 5-7), donde enseña las bienaventuranzas, el Padre Nuestro y los principios de su reino.', libro: 'discurso-maestro-de-jesucristo' },
    { termino: 'Siete iglesias', def: 'Las siete congregaciones de Asia Menor a las que Juan dirige cartas en Apocalipsis 2 y 3. Se interpretan como mensajes reales para su época y como etapas de la historia de la iglesia.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Sumo sacerdote', def: 'Jefe de los sacerdotes de Israel, el único que entraba una vez al año al lugar santísimo. Hebreos presenta a Cristo como nuestro sumo sacerdote en el santuario celestial.', libro: 'cristo-en-su-santuario' },
    { termino: 'Tentación', def: 'Prueba que nos invita a alejarnos de Dios. Jesús fue tentado en el desierto y venció, y por eso puede ayudar a quienes son tentados.', libro: 'en-el-desierto-de-la-tentacion' },
    { termino: 'Testimonio', def: 'Contar lo que Dios ha hecho en la propia vida. En los escritos de Elena G. White, la palabra se usa también para designar sus mensajes a la iglesia.', libro: 'testimonios-para-la-iglesia-tomo-1' },
    { termino: 'Tiempo de angustia', def: 'Época de conflicto mundial anunciada en Daniel 12:1, previa al regreso de Cristo, en la que el pueblo de Dios es librado.', libro: 'eventos-de-los-ultimos-dias' },
    { termino: 'Tres ángeles', def: 'Los mensajes de Apocalipsis 14:6-12: el evangelio eterno, la caída de Babilonia y la advertencia contra adorar a la bestia. El adventismo los considera su misión.', libro: 'el-conflicto-de-los-siglos' },
    { termino: 'Trinidad', def: 'Doctrina cristiana que afirma que Dios es uno y se manifiesta como Padre, Hijo y Espíritu Santo, tres personas eternas y en perfecta unidad.', libro: 'creencias-de-los-adventistas-del-septimo-dia' },
    { termino: 'Vegetarianismo', def: 'Dieta sin carne. Los adventistas la promueven por motivos de salud y por el ideal del Edén, donde el alimento era de origen vegetal.', libro: 'leyes-sobre-el-regimen-alimenticio' },
    { termino: 'Versículo', def: 'Cada una de las pequeñas divisiones numeradas de los capítulos de la Biblia. Se cita con el nombre del libro, capítulo y versículo, por ejemplo Juan 3:16.', libro: 'biblia-rvr60-negro' },
    { termino: 'Visión', def: 'Forma en la que Dios se comunica con sus profetas, mostrándoles escenas o mensajes de forma sobrenatural, a veces mientras están despiertos y a veces en sueños.', libro: 'primeros-escritos' }
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
