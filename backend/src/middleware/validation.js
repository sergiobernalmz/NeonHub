const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      message: 'Errores de validación en los datos enviados',
      error: {
        code: 'VALIDATION_ERROR',
        details: formattedErrors,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

const sanitizeInput = (req, res, next) => {
  // Sanitize strings in body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return obj.trim();
  }

  return obj;
};

const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return next(new AppError('El número de página debe ser un entero positivo', 400, 'INVALID_PAGE'));
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return next(new AppError('El límite debe estar entre 1 y 100', 400, 'INVALID_LIMIT'));
  }
  
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };
  
  next();
};

const validateUUID = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!value || !uuidRegex.test(value)) {
      return next(new AppError(`El parámetro ${paramName} debe ser un UUID válido`, 400, 'INVALID_UUID'));
    }
    
    next();
  };
};

const validateDateRange = (req, res, next) => {
  const { start_date, end_date } = req.query;
  
  if (start_date && !isValidDate(start_date)) {
    return next(new AppError('La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)', 400, 'INVALID_START_DATE'));
  }
  
  if (end_date && !isValidDate(end_date)) {
    return next(new AppError('La fecha de fin debe ser una fecha válida (YYYY-MM-DD)', 400, 'INVALID_END_DATE'));
  }
  
  if (start_date && end_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return next(new AppError('La fecha de inicio no puede ser posterior a la fecha de fin', 400, 'INVALID_DATE_RANGE'));
    }
  }
  
  next();
};

const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

const validateSort = (allowedFields) => {
  return (req, res, next) => {
    const { sortBy, sortOrder = 'ASC' } = req.query;
    
    if (sortBy && !allowedFields.includes(sortBy)) {
      return next(new AppError(
        `El campo de ordenamiento debe ser uno de: ${allowedFields.join(', ')}`, 
        400, 
        'INVALID_SORT_FIELD'
      ));
    }
    
    if (sortOrder && !['ASC', 'DESC'].includes(sortOrder.toUpperCase())) {
      return next(new AppError('El orden debe ser ASC o DESC', 400, 'INVALID_SORT_ORDER'));
    }
    
    if (sortBy) {
      req.sort = {
        field: sortBy,
        order: sortOrder.toUpperCase()
      };
    }
    
    next();
  };
};

const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize = 5 * 1024 * 1024, // 5MB
    maxFiles = 5
  } = options;
  
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    const files = Array.isArray(req.files) ? req.files : [req.files];
    
    if (files.length > maxFiles) {
      return next(new AppError(`Máximo ${maxFiles} archivos permitidos`, 400, 'TOO_MANY_FILES'));
    }
    
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError(
          `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`, 
          400, 
          'INVALID_FILE_TYPE'
        ));
      }
      
      if (file.size > maxSize) {
        return next(new AppError(
          `El archivo es demasiado grande. Tamaño máximo: ${Math.round(maxSize / 1024 / 1024)}MB`, 
          400, 
          'FILE_TOO_LARGE'
        ));
      }
    }
    
    next();
  };
};

const validateJSONStructure = (schema) => {
  return (req, res, next) => {
    try {
      const isValid = validateObjectAgainstSchema(req.body, schema);
      if (!isValid) {
        return next(new AppError('Estructura JSON inválida', 400, 'INVALID_JSON_STRUCTURE'));
      }
      next();
    } catch (error) {
      return next(new AppError('Error al validar estructura JSON', 400, 'JSON_VALIDATION_ERROR'));
    }
  };
};

const validateObjectAgainstSchema = (obj, schema) => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  for (const [key, type] of Object.entries(schema)) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] !== type) {
        return false;
      }
    }
  }
  
  return true;
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  validatePagination,
  validateUUID,
  validateDateRange,
  validateSort,
  validateFileUpload,
  validateJSONStructure
};