const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // registramos el error en Better Stack
  logger.error(err.message, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // error de validación de Sequelize
  if (err instanceof ValidationError) {
    const message = 'Errores de validación';
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message,
      error: {
        code: 'VALIDATION_ERROR',
        details: errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  // error de restricción única de Sequelize
  if (err instanceof UniqueConstraintError) {
    const message = 'El valor ya existe en el sistema';
    const errors = err.errors.map(error => ({
      field: error.path,
      message: `El ${error.path} ya está en uso`,
      value: error.value
    }));
    
    return res.status(409).json({
      success: false,
      message,
      error: {
        code: 'DUPLICATE_ENTRY',
        details: errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  // error de clave foránea de Sequelize
  if (err instanceof ForeignKeyConstraintError) {
    const message = 'Referencia inválida';
    
    return res.status(400).json({
      success: false,
      message,
      error: {
        code: 'FOREIGN_KEY_CONSTRAINT',
        details: 'El recurso referenciado no existe',
        timestamp: new Date().toISOString()
      }
    });
  }

  // errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      error: {
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado',
      error: {
        code: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString()
      }
    });
  }

  // errores de Multer al subir archivos
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande',
      error: {
        code: 'FILE_TOO_LARGE',
        maxSize: '5MB',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Demasiados archivos',
      error: {
        code: 'TOO_MANY_FILES',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Campo de archivo inesperado',
      error: {
        code: 'UNEXPECTED_FILE_FIELD',
        timestamp: new Date().toISOString()
      }
    });
  }

  // errores personalizados de la aplicación
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      error: {
        code: err.code || 'APPLICATION_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // errores de conexión a la base de datos
  if (err.name === 'MongoError' || err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      success: false,
      message: 'Error de conexión a la base de datos',
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // errores de límite de peticiones
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: err.retryAfter || '1 minute',
        timestamp: new Date().toISOString()
      }
    });
  }

  // errores de sintaxis en el JSON del body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la solicitud',
      error: {
        code: 'INVALID_JSON',
        timestamp: new Date().toISOString()
      }
    });
  }

  // si no encaja en ninguno de los anteriores, devolvemos 500
  res.status(error.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      timestamp: new Date().toISOString()
    }
  });
};

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const notFound = (req, res, next) => {
  const error = new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
  next(error);
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFound
};