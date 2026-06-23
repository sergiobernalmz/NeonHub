const Sentry = require("@sentry/node");

// solo inicializamos Sentry si hay un DSN configurado en el entorno
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    environment: process.env.NODE_ENV || 'development'
  });
  console.log('✅ Sentry SDK inicializado');
}
