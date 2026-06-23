const { Store } = require('../models');

const isIpAddress = (value = '') => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);

const normalizeHost = (host = '') => host.split(':')[0].toLowerCase().trim();

const shouldSkipHostResolution = (host) => {
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isIpAddress(host)) return true;
  return false;
};

const tenantContext = async (req, res, next) => {
  try {
    const host = normalizeHost(req.headers.host || req.hostname || '');
    req.tenant = null;

    if (!shouldSkipHostResolution(host)) {
      const baseDomain = (process.env.TENANT_BASE_DOMAIN || 'neonhub.es').toLowerCase();

      // Check if host ends with base domain (subdomain-based routing)
      if (host.endsWith(baseDomain)) {
        let withoutBase = host.slice(0, -(baseDomain.length)).replace(/\.$/, '');

        // si la petición va al dominio principal (sin subdominio), miramos Origin/Referer
        // para detectar llamadas cross-origin desde un subdominio de tenant
        // (ej: el frontend en cabezonstore.neonhub.es llamando a neonhub.es)
        if (!withoutBase) {
          const origin = req.headers.origin || '';
          const referer = req.headers.referer || '';
          const extractHost = (url) => {
            try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
          };
          const sourceHost = extractHost(origin) || extractHost(referer);
          if (sourceHost && sourceHost.endsWith(baseDomain) && sourceHost !== baseDomain) {
            withoutBase = sourceHost.slice(0, -(baseDomain.length)).replace(/\.$/, '');
          }
        }

        const subdomain = withoutBase || 'main';

        // 'api' es el propio dominio del backend — saltamos la búsqueda de tienda
        // pero seguimos para que el header x-tenant-id se procese en Electron/móvil.
        if (subdomain !== 'api') {
          const store = await Store.findOne({ where: { subdomain, is_active: true } });

          if (store) {
            req.tenant = {
              id: store.id,
              name: store.name,
              subdomain: store.subdomain,
              custom_domain: store.custom_domain || null,
              schemaName: store.settings?.schema_name || null,
              store
            };
          } else {

            const inactiveStore = await Store.findOne({ where: { subdomain } });
            if (inactiveStore && !inactiveStore.is_active) {
              req.tenantInactive = true;
              req.tenantInactiveReason = inactiveStore.paused_reason || 'Servicio desactivado';
            }
          }
        }
      } else {
        // Custom domain routing: host does NOT end with base domain
        // Look up store by custom_domain field
        const store = await Store.findOne({
          where: {
            custom_domain: host,
            is_active: true
          }
        });

        if (store) {
          req.tenant = {
            id: store.id,
            name: store.name,
            subdomain: store.subdomain,
            custom_domain: store.custom_domain,
            schemaName: store.settings?.schema_name || null,
            store
          };
        } else {
          // Check if custom domain exists but store is inactive
          const inactiveStore = await Store.findOne({ where: { custom_domain: host } });
          if (inactiveStore && !inactiveStore.is_active) {
            req.tenantInactive = true;
            req.tenantInactiveReason = inactiveStore.paused_reason || 'Servicio desactivado';
          }
        }
      }
    }

    // usamos el header x-tenant-id para apps nativas (Electron, Flutter) sin subdominio
    // lo saltamos si el subdominio coincide con una tienda inactiva (req.tenantInactive) para evitar bypass
    if (!req.tenant && !req.tenantInactive && req.headers['x-tenant-id']) {
      const tenantId = req.headers['x-tenant-id'];
      const store = await Store.findOne({ where: { id: tenantId, is_active: true } });
      if (store) {
        req.tenant = {
          id: store.id,
          name: store.name,
          subdomain: store.subdomain,
          custom_domain: store.custom_domain || null,
          schemaName: store.settings?.schema_name || null,
          store
        };
      }
    }

    return next();
  } catch (error) {
    console.error('Tenant context resolution error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resolviendo el contexto de tenant',
      error: {
        code: 'TENANT_CONTEXT_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = tenantContext;
