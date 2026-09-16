// ==========================================================================
// CONFIGURACIÓN — sustituye estos valores por los de TU propio proyecto
// ==========================================================================
// No pasa nada por dejar esta información en el código: son claves públicas
// pensadas para usarse en el navegador (la seguridad real la dan las reglas
// de Firestore y la verificación de dominio, no el secreto de esta clave).

// 1) Firebase → Configuración del proyecto → Tus apps → SDK de Firebase
var firebaseConfig = {
  apiKey: "AIzaSyDGOeVoojBP6LHv3prtvuC2c8N_vy3uVRA",
  authDomain: "libreria-tu-mayor-tesoro.firebaseapp.com",
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
//      "Registrar" → proveedor "reCAPTCHA v3" → te da una clave de sitio.
//   b) Pega esa clave aquí abajo, entre las comillas.
//   c) Sube los cambios y espera a ver tráfico verificado en el panel de
//      App Check (columna "Solicitudes verificadas") durante uno o dos días.
//   d) SOLO cuando veas que la mayoría del tráfico ya llega verificado,
//      activa la aplicación forzosa ("Enforce") en App Check para
//      Firestore, Storage y Functions. Hazlo en ese orden y no antes,
//      o corres el riesgo de bloquear a clientes reales por error.
// Mientras esta clave esté vacía, App Check simplemente no se activa y la
// web sigue funcionando exactamente igual que ahora.
var APPCHECK_SITE_KEY = "";

// 4) Panel de administración (admin.html) — UID(s) de Firebase Authentication
// que pueden entrar a gestionar los pedidos. Consíguelo en:
// Firebase Console → Authentication → Users → columna "User UID" (copia el
// de la cuenta con la que quieras administrar la tienda) y pégalo aquí.
// Puedes añadir varios UIDs separados por comas si más de una persona
// gestiona los pedidos.
var ADMIN_UIDS = [
  "EPkK3ItKBRhA5bNeqs9PKbM0svB3"
];
