// ==========================================================================
// CONFIGURACIÓN — sustituye estos valores por los de TU propio proyecto
// ==========================================================================
// No pasa nada por dejar esta información en el código: son claves públicas
// pensadas para usarse en el navegador (la seguridad real la dan las reglas
// de Firestore y la verificación de dominio, no el secreto de esta clave).

// 1) Firebase → Configuración del proyecto → Tus apps → SDK de Firebase
var firebaseConfig = {
  apiKey: "AIzaSyDGOeVoojBP6LHv3prtvuC2c8N_vy3uVRA",
  // IMPORTANTE (inicio de sesión con Google y otros proveedores): el dominio
  // de autenticación debe ser el MISMO que el de la web. Si es otro (como
  // "...firebaseapp.com" mientras la web está en libreriatumayortesoro.com),
  // los navegadores actuales (Chrome, Safari, Firefox) bloquean el almacenamiento
  // que comparte con la web y el inicio de sesión "vuelve" sin haberse hecho,
  // sin dar ningún error. Por eso aquí se usa el dominio desde el que se visita
  // la web. Para que funcione hay que dar de alta una vez, en Google Cloud,
  // https://TU-DOMINIO/__/auth/handler (ver las instrucciones que te di).
  // En local, en web.app o en firebaseapp.com se sigue usando el de siempre.
  authDomain: /(^|\.)libreriatumayortesoro\.com$/.test(window.location.hostname)
    ? window.location.hostname
    : "libreria-tu-mayor-tesoro.firebaseapp.com",
  projectId: "libreria-tu-mayor-tesoro",
  storageBucket: "libreria-tu-mayor-tesoro.firebasestorage.app",
  messagingSenderId: "405006984944",
  appId: "1:405006984944:web:5529e946c4984932520435"
};

// 2) EmailJS → Account → General (Public Key) y Email Services / Email Templates
var emailjsConfig = {
  publicKey: "Z8d0FXpZong8v6zMg",
  serviceId: "service_35rkith",
  customerTemplateId: "template_q9dhnch",
  ownerTemplateId: "template_iai6flh",
  ownerEmail: "libreriamayortesoro@gmail.com"
};

// 3) App Check (opcional, pero muy recomendable) — protege tus funciones y
// tu base de datos de bots y scripts automáticos que intenten llamarlas
// sin pasar por tu web de verdad (spam de pedidos, fuerza bruta, etc.).
// Pasos para activarlo:
//   a) Firebase Console → Compilación → App Check → Apps → tu app web →
//      "Registrar" → proveedor "reCAPTCHA Enterprise" → te da una clave de sitio.
//   b) Pega esa clave aquí abajo, entre las comillas.
//   c) Sube los cambios y espera a ver tráfico verificado en el panel de
//      App Check (columna "Solicitudes verificadas") durante uno o dos días.
//   d) SOLO cuando veas que la mayoría del tráfico ya llega verificado,
//      activa la aplicación forzosa ("Enforce") en App Check para
//      Firestore, Storage y Functions. Hazlo en ese orden y no antes,
//      o corres el riesgo de bloquear a clientes reales por error.
// Mientras esta clave esté vacía, App Check simplemente no se activa y la
// web sigue funcionando exactamente igual que ahora.
var APPCHECK_SITE_KEY = "6LdUPcotAAAAAETPbh8wVT_FdklB1r_xCkNkQfSh";

// 4) Panel de administración (admin.html) — UID(s) de Firebase Authentication
// que pueden entrar a gestionar los pedidos. Consíguelo en:
// Firebase Console → Authentication → Users → columna "User UID" (copia el
// de la cuenta con la que quieras administrar la tienda) y pégalo aquí.
// Puedes añadir varios UIDs separados por comas si más de una persona
// gestiona los pedidos.
var ADMIN_UIDS = [
  "EPkK3ItKBRhA5bNeqs9PKbM0svB3"
];

// 4) Formas de iniciar sesión que se muestran en "Mi cuenta".
// Además del correo con contraseña, que siempre está. Pon "true" solo en las que
// ya hayas activado en Firebase → Authentication → Método de acceso:
//   google     → ya activado
//   emailLink  → "Enlace por correo": entrar sin contraseña. Se activa en Firebase
//                → Authentication → Método de acceso → Correo electrónico/contraseña
//                → marca "Vínculo de correo electrónico (acceso sin contraseña)".
//   facebook   → requiere crear una app en developers.facebook.com
//   apple      → requiere cuenta de Apple Developer (99 $/año)
//   microsoft  → requiere registrar una app en Microsoft Entra (gratis)
var metodosAcceso = {
  google: true,
  emailLink: true,
  facebook: false,
  apple: false,
  microsoft: false
};

// 5) Verificación del correo con código. Las cuentas con correo y contraseña
// creadas a partir de esta fecha deben verificar su correo (código de 6 dígitos)
// antes de comprar. Las anteriores no se bloquean. Debe coincidir con
// VERIFICACION_OBLIGATORIA_DESDE en functions/index.js.
var VERIFICACION_OBLIGATORIA_DESDE = Date.parse('2026-09-21T00:00:00Z');
