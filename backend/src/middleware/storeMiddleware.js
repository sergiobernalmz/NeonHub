const { Store } = require('../models');

const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const storeMiddleware = async (req, res, next) => {
    try {
        const apiKey = req.header('X-NeonHub-Api-Key');
        const storeId = req.header('X-Store-ID');

        let store = null;

        if (req.tenant && req.tenant.store) {
            store = req.tenant.store;
        }

        if (!store && apiKey) {
            // buscamos la tienda por API Key (pública o secreta)
            store = await Store.findOne({
                where: {
                    is_active: true,
                    [require('sequelize').Op.or]: [
                        { api_key_public: apiKey },
                        { api_key_secret: apiKey }
                    ]
                }
            });
        } else if (!store && storeId) {
            if (!isValidUUID(storeId)) {
                console.warn(`[storeMiddleware] Invalid store ID ignored: ${storeId}`);
                return next();
            }
            // buscamos por ID y también comprobamos que esté activa
            store = await Store.findByPk(storeId);
            if (store && !store.is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'Esta empresa está desactivada. Contacta al administrador.',
                    error: { code: 'STORE_INACTIVE', timestamp: new Date().toISOString() }
                });
            }
        }

        if (!store) {
            return res.status(401).json({
                success: false,
                message: 'Store context required (subdomain, X-NeonHub-Api-Key or X-Store-ID)',
                error: {
                    code: 'STORE_CONTEXT_REQUIRED',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // adjuntamos la tienda al objeto request
        req.store = store;

        next();
    } catch (error) {
        console.error('Store resolution error:', error);
        res.status(500).json({ error: 'Internal Server Error during tenancy resolution' });
    }
};

module.exports = storeMiddleware;
