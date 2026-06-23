const { User, Role, Store } = require('../models');

const superAdminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // comprobamos si el usuario pertenece a la tienda principal (subdomain = 'main')
        // req.store puede que ya esté, pero verificamos también directamente
        // por el contexto del store actual o el store del usuario

        // si el admin entra en 'TIENDA-PEPE', no actúa como superadmin allí
        // las acciones de superadmin (crear tiendas) deben hacerse desde el Dashboard principal

        const tenantSubdomain = req.tenant?.subdomain || req.store?.subdomain;
        if (tenantSubdomain !== 'main') {
            return res.status(403).json({ error: 'Super Admin actions must be performed from the Main Dashboard' });
        }

        const fullUser = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                as: 'roles',
                through: { where: { is_active: true } },
                attributes: ['name', 'level', 'scope']
            }]
        });

        const roles = fullUser?.roles || [];
        const isSuperAdmin = roles.some(role => role.name === 'superadmin' || role.scope === 'platform');

        if (!isSuperAdmin) {
            return res.status(403).json({ error: 'Access denied: Super Admin only' });
        }

        next();
    } catch (error) {
        console.error('Super Admin Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = superAdminMiddleware;
