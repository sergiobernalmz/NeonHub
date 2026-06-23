

const validator = require('validator');

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // escapamos las entidades HTML
  return validator.escape(str);
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  // prevenimos la contaminación del prototipo
  if (obj.hasOwnProperty('__proto__') || 
      obj.hasOwnProperty('constructor') || 
      obj.hasOwnProperty('prototype')) {
    throw new Error('Potential prototype pollution detected');
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // NO sanitizamos la key, solo validamos que no sea peligrosa
      if (/(__proto__|constructor|prototype)/i.test(key)) {
        throw new Error('Invalid property name detected');
      }
      
      if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        // NO escapamos HTML aquí, solo validamos caracteres peligrosos
        sanitized[key] = obj[key];
      } else {
        sanitized[key] = obj[key];
      }
    }
  }
  
  return sanitized;
};

const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid input detected' });
  }
};

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'La contraseña debe tener al menos 8 caracteres'
    };
  }
  
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos una mayúscula'
    };
  }
  
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos una minúscula'
    };
  }
  
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'La contraseña debe contener al menos un número'
    };
  }
  
  return { valid: true, message: 'Contraseña válida' };
};

const validateFileUpload = (file) => {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo');
  }
  

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  

  const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExt)) {
    throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes (jpg, jpeg, png, gif, webp)');
  }
  

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Tipo MIME no permitido');
  }
  

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('El archivo es demasiado grande. Tamaño máximo: 10MB');
  }
  
  // limpiamos el nombre del archivo
  const sanitizedFilename = file.originalname
    .replace(/\.\./g, '')  // eliminamos directory traversal
    .replace(/[/\\]/g, '') // eliminamos separadores de ruta
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // reemplazamos caracteres especiales
  
  return {
    ...file,
    sanitizedFilename
  };
};

const requestCounts = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userData = requestCounts.get(ip);
    
    if (now > userData.resetTime) {

      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Por favor, intente más tarde.',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }
    
    userData.count++;
    next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60000);

const isValidUUID = (uuid) => {
  return validator.isUUID(uuid);
};

const isValidInteger = (value) => {
  return validator.isInt(String(value));
};

const isValidURL = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
};

const validateSQLParams = (req, res, next) => {
  const dangerousPatterns = [
    // Comentarios SQL con espacios (-- seguido de espacio)
    /--\s+/gi,
    // Comentarios de bloque
    /\/\*[\s\S]*?\*\//gi,
    // UNION attack
    /\bUNION\s+(ALL\s+)?SELECT\b/gi,
    // Stacked queries peligrosos
    /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+/gi,
    // Exec malicioso
    /\b(EXEC|EXECUTE)\s*\(\s*'/gi,
    // Stored procedures peligrosos
    /\b(xp_cmdshell|sp_executesql|xp_regread|xp_regwrite)\b/gi,
    // INTO OUTFILE/DUMPFILE
    /INTO\s+(OUT|DUMP)FILE/gi
  ];
  
  const checkValue = (value) => {
    if (typeof value !== 'string') {
      return true;
    }
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        console.warn('Patrón de entrada peligroso bloqueado');
        return false;
      }
    }
    return true;
  };
  
  const checkObject = (obj, path = '') => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (!checkObject(obj[key], currentPath)) return false;
        } else if (!checkValue(obj[key])) {
          console.warn(`Entrada peligrosa detectada en ${currentPath}`);
          return false;
        }
      }
    }
    return true;
  };
  
  try {
    if (req.body && !checkObject(req.body, 'body')) {
      throw new Error('Entrada inválida detectada en el body');
    }
    if (req.query && !checkObject(req.query, 'query')) {
      throw new Error('Entrada inválida detectada en el query');
    }
    if (req.params && !checkObject(req.params, 'params')) {
      throw new Error('Entrada inválida detectada en los params');
    }
    
    next();
  } catch (error) {
    console.error('validateSQLParams error:', error.message);
    res.status(400).json({ error: 'Entrada inválida detectada' });
  }
};

const validateCSRF = (req, res, next) => {
  // saltamos la verificación CSRF en peticiones GET
  if (req.method === 'GET') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }
  
  next();
};

const generateCSRFToken = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

const setSecurityHeaders = (req, res, next) => {
  // prevenimos el clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // evitamos el sniffing de MIME types
  res.setHeader('X-Content-Type-Options', 'nosniff');
  

  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // política de referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // política de seguridad de contenido (CSP)
  const isProduction = process.env.NODE_ENV === 'production';
  const csp = isProduction
    ? "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https: wss:; " +
      "frame-ancestors 'none';"
    : "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';";

  res.setHeader(
    'Content-Security-Policy',
    csp
  );
  
  // quitamos la cabecera que expone el servidor
  res.removeHeader('X-Powered-By');
  
  next();
};

const validatePayloadSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: 'Payload demasiado grande',
          maxSize
        });
      }
    }
    
    next();
  };
};

const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const value = parseInt(match[1], 10);
  const unit = match[2] || 'b';
  
  return value * (units[unit] || 1);
};

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  validateEmail,
  validatePassword,
  validateFileUpload,
  validateSQLParams,
  validateCSRF,
  generateCSRFToken,
  rateLimit,
  setSecurityHeaders,
  validatePayloadSize,
  isValidUUID,
  isValidInteger,
  isValidURL
};
