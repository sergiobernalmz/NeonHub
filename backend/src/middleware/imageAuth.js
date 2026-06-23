const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const imageAuth = async (req, res, next) => {
	try {
		const authHeader = req.headers['authorization'];
		let token = authHeader && authHeader.split(' ')[1];
		if (!token && req.query && req.query.token) token = req.query.token;

		if (!token) {
			return res.status(401).json({ success: false, message: 'Token de acceso requerido' });
		}

		if (!process.env.JWT_SECRET) {
			return res.status(500).json({
				success: false,
				message: 'Servidor mal configurado',
				error: { code: 'SERVER_MISCONFIGURED', detail: 'JWT_SECRET no está configurado' }
			});
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const user = await User.findByPk(decoded.id, {
			include: [{
				model: Role,
				as: 'roles',
				through: { where: { is_active: true } },
				attributes: ['id', 'name', 'permissions', 'level']
			}],
			attributes: { exclude: ['password_hash'] }
		});

		if (!user || !user.is_active) {
			return res.status(401).json({ success: false, message: 'Usuario no autorizado' });
		}

		req.user = {
			id: user.id,
			username: user.username,
			email: user.email,
			roles: user.roles || [],
			permissions: user.roles && user.roles.length > 0 ? user.roles.flatMap(r => r.permissions || []) : []
		};

		next();
	} catch (err) {
		console.error('imageAuth error:', err.message || err);
		return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
	}
};

module.exports = imageAuth;
