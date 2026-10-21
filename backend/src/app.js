require('./instrument.js');

const express = require('express');
const Sentry = require('@sentry/node');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInput: validateInput } = require('./middleware/validation');
const {
  sanitizeInput,
  setSecurityHeaders,
  validateSQLParams
} = require('./middleware/security');
const tenantContext = require('./middleware/tenantContext');

const apiRoutes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// trust proxy para Cloudflare → NPM → Backend
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

const isProduction = process.env.NODE_ENV === 'production';

const buildAllowedOrigins = () => {
  const origins = new Set();

  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  for (const origin of fromEnv) origins.add(origin);

  const candidates = [
    process.env.FRONTEND_URL,
    process.env.LANDING_URL,
    process.env.PUBLIC_SITE_URL
  ].filter(Boolean);

  for (const candidate of candidates) origins.add(candidate);

  return origins;
};

const allowedOrigins = buildAllowedOrigins();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (allowedOrigins.has(origin)) return true;

  const baseDomain = (process.env.TENANT_BASE_DOMAIN || '').toLowerCase().trim();
  if (!baseDomain) return false;

  try {
    const { hostname } = new URL(origin);
    const host = (hostname || '').toLowerCase();
    return host === baseDomain || host.endsWith(`.${baseDomain}`);
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!isProduction) return callback(null, true);
    return isAllowedOrigin(origin)
      ? callback(null, true)
      : callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Api-Key',
    'X-NeonHub-Api-Key'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// excluimos /updates/ de la compresión para que electron-updater reciba Content-Length y muestre el progreso
app.use(compression({
  filter: (req, res) => {
    if (req.path.startsWith('/updates/')) return false;
    return compression.filter(req, res);
  }
}));

// body sin parsear para los webhooks de Stripe (tiene que ir antes de express.json())
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});

app.use('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});

// middleware para parsear el body
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf && buf.length > 0) {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({
          success: false,
          message: 'JSON inválido',
          error: {
            code: 'INVALID_JSON',
            timestamp: new Date().toISOString()
          }
        });
        throw new Error('Invalid JSON');
      }
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// parseamos las cookies
app.use(cookieParser());

// log de peticiones
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// limitador de peticiones
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 500 : 2000, // en producción detrás de proxy ponemos más margen
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // usamos X-Forwarded-For para obtener la IP real del cliente
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
  skip: (req) => {
    // saltamos el rate limiting para el health check
    return req.path === '/api/health' || req.path === '/health';
  }
});

app.use(limiter);

// cabeceras de seguridad
app.use(setSecurityHeaders);

// CSRF protection for state-changing operations on PRIVATE routes
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  // Skip CSRF for public routes (no auth required, already rate-limited)
  const publicPaths = ['/api/public', '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/demo', '/api/auth/verify-email', '/api/auth/activate', '/api/contact'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  // Skip CSRF for Stripe webhooks, API key routes, and ingest routes.
  // /api/billing/admin/* se autentica con la cabecera x-admin-secret (llamadas
  // servidor-a-servidor desde el panel admin de la landing, que no tienen sesión
  // de usuario ni token CSRF) — mismo caso que /api/v1 y /api/ingest, exento por
  // diseño. El middleware requireAdminSecret de billing.js sigue exigiendo el secret.
  if (req.path.includes('/payments/webhook') || req.path.includes('/billing/stripe/webhook') || req.path.startsWith('/api/v1') || req.path.startsWith('/api/ingest') || req.path.startsWith('/api/billing/admin')) {
    return next();
  }
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  if (!token) {
    return res.status(403).json({ success: false, error: { code: 'CSRF_TOKEN_MISSING', message: 'Token CSRF requerido' } });
  }
  // In production, validate against stored session token
  next();
});

// sanitizamos el input y prevenimos inyección SQL
app.use(sanitizeInput);
app.use(validateSQLParams);

// validación legacy (por si acaso)
app.use(validateInput);

// archivos estáticos (subidas, documentación, etc.)
// añadimos cabeceras CORS para las subidas
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  if (!isProduction || isAllowedOrigin(origin)) {
    if (origin) res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/docs', express.static(path.join(__dirname, '../docs')));

app.get('/updates/download', (req, res) => {
  const updatesDir = path.join(__dirname, '../public/updates');
  try {
    const files = fs.readdirSync(updatesDir)
      .filter(f => f.endsWith('.exe') && !f.includes('blockmap'))
      .sort((a, b) => {
        const va = a.match(/(\d+)\.(\d+)\.(\d+)/);
        const vb = b.match(/(\d+)\.(\d+)\.(\d+)/);
        if (!va || !vb) return 0;
        for (let i = 1; i <= 3; i++) {
          const diff = parseInt(vb[i]) - parseInt(va[i]);
          if (diff !== 0) return diff;
        }
        return 0;
      });
    if (files.length === 0) {
      return res.status(404).json({ error: 'No hay instalador disponible' });
    }
    res.redirect(`/updates/${files[0]}`);
  } catch {
    res.status(500).json({ error: 'Error al buscar instalador' });
  }
});

app.use('/updates', express.static(path.join(__dirname, '../public/updates'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('latest.yml')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// endpoint de despliegue (sin contexto de tenant, auth por API key)
const updateRoutes = require('./routes/updateRoutes');
app.use('/api/deploy', updateRoutes);

// API pública v1 — auth por API key, sin contexto de tenant
const v1Router = require('./routes/v1');
app.use('/api/v1', v1Router);

// rutas de la API
app.use(tenantContext);
app.use('/api', apiRoutes);

// endpoint raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EcoCommerce API está funcionando',
    data: {
      name: 'EcoCommerce API',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        api: '/api',
        health: '/api/health',
        info: '/api/info',
        auth: '/api/auth',
        products: '/api/products',
        orders: '/api/orders'
      }
    }
  });
});

// endpoint de health check (fuera del rate limiting)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// handler del 404 para rutas que no existen
app.use(notFound);

// manejador global de errores
// el handler de errores de Sentry tiene que registrarse antes que cualquier otro middleware de errores
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

// apagado limpio del servidor
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

// capturamos promesas rechazadas sin manejar
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection', err);
  // Don't exit - graceful degradation. Only exit for truly fatal startup errors
  if (err.message && err.message.includes('connect ECONNREFUSED')) {
    logger.error('Fatal: Could not connect to required service');
    process.exit(1);
  }
});

// capturamos excepciones no controladas
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
});

module.exports = app;

