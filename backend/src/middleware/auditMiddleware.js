const { AuditLog } = require('../models');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const auditAction = (resourceType, action) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function auditInterceptor(body) {
      // restauramos enseguida para evitar interceptar llamadas anidadas
      res.json = originalJson;

      originalJson(body);

      // solo registramos si la respuesta fue exitosa (status < 400)
      if (res.statusCode < 400) {
        const userId     = req.user?.id || null;
        const storeId    = resolveStoreId(req);
        const resourceId = res.locals.resourceId || null;
        const ip         = (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '').substring(0, 45);
        const description = `User ${userId || 'anonymous'} ${action}d ${resourceType}${resourceId ? ` ${resourceId}` : ''}`;

        AuditLog.create({
          user_id:       userId,
          store_id:      storeId,
          action,
          resource_type: resourceType,
          resource_id:   resourceId,
          ip_address:    ip,
          user_agent:    req.headers['user-agent'] || null,
          description
        }).catch(err => console.error('auditMiddleware: AuditLog.create failed (non-blocking):', err.message));
      }
    };

    next();
  };
};

module.exports = { auditAction };
