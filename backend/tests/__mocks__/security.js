// Mock del middleware de security para evitar setInterval en tests

const rateLimit = (req, res, next) => {
  next();
};

const ddosProtection = (req, res, next) => {
  next();
};

const helmet = (req, res, next) => {
  next();
};

const csrf = (req, res, next) => {
  next();
};

const validateInput = () => {
  return (req, res, next) => {
    next();
  };
};

const sanitizeInput = (req, res, next) => {
  next();
};

const setSecurityHeaders = (req, res, next) => {
  next();
};

const validateSQLParams = (req, res, next) => {
  next();
};

module.exports = {
  rateLimit,
  ddosProtection,
  helmet,
  csrf,
  validateInput,
  sanitizeInput,
  setSecurityHeaders,
  validateSQLParams
};