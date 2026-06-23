const express = require('express');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const auditLogController = require('../controllers/auditLogController');

const router = express.Router();

const requireAdminSecret = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    const expected = process.env.ADMIN_API_SECRET;
    if (!expected) return res.status(500).json({ success: false, message: 'Servidor mal configurado' });
    if (!secret || secret !== expected) return next(); // fall through to JWT route
    next('route'); // skip to next matching route — but we need to handle here directly
};

router.get('/audit-logs', async (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    const expected = process.env.ADMIN_API_SECRET;
    if (!expected || !secret || secret !== expected) return next();

    // x-admin-secret path — system/n8n endpoint
    try {
        const { AuditLog } = require('../models');
        const { Op, fn, col, literal } = require('sequelize');

        const { anomalies, period, since, action } = req.query;

        const parsePeriodMs = (p = '10m') => {
            const m = String(p).match(/^(\d+)(m|h|d)$/);
            if (!m) return 10 * 60_000;
            const v = parseInt(m[1], 10);
            return m[2] === 'm' ? v * 60_000 : m[2] === 'h' ? v * 3_600_000 : v * 86_400_000;
        };

        if (anomalies === 'true') {
            const since_ts = new Date(Date.now() - parsePeriodMs(period));
            const timeFilter = { created_at: { [Op.gte]: since_ts } };
            const detected = [];

            const massDeletes = await AuditLog.findAll({
                where: { ...timeFilter, action: 'delete' },
                attributes: [
                    'user_id', 'ip_address',
                    [fn('COUNT', col('AuditLog.id')), 'count'],
                    [fn('MIN', col('created_at')), 'first_seen'],
                    [fn('MAX', col('created_at')), 'last_seen']
                ],
                group: ['user_id', 'ip_address'],
                having: literal('COUNT("AuditLog"."id") > 3'),
                raw: true
            });
            massDeletes.forEach(r => detected.push({
                type: 'mass_delete', ip: r.ip_address, user_id: r.user_id,
                count: parseInt(r.count), first_seen: r.first_seen, last_seen: r.last_seen
            }));

            const roleChanges = await AuditLog.findAll({
                where: { ...timeFilter, action: 'update', resource_type: { [Op.iLike]: '%role%' } },
                attributes: [
                    'user_id', 'ip_address',
                    [fn('COUNT', col('AuditLog.id')), 'count'],
                    [fn('MIN', col('created_at')), 'first_seen'],
                    [fn('MAX', col('created_at')), 'last_seen']
                ],
                group: ['user_id', 'ip_address'],
                raw: true
            });
            roleChanges.forEach(r => detected.push({
                type: 'role_change', ip: r.ip_address, user_id: r.user_id,
                count: parseInt(r.count), first_seen: r.first_seen, last_seen: r.last_seen
            }));

            const rapidLogins = await AuditLog.findAll({
                where: { ...timeFilter, action: 'login' },
                attributes: [
                    'ip_address',
                    [fn('COUNT', col('AuditLog.id')), 'count'],
                    [fn('MIN', col('created_at')), 'first_seen'],
                    [fn('MAX', col('created_at')), 'last_seen']
                ],
                group: ['ip_address'],
                having: literal('COUNT("AuditLog"."id") > 5'),
                raw: true
            });
            rapidLogins.forEach(r => detected.push({
                type: 'failed_login', ip: r.ip_address, user_id: null,
                count: parseInt(r.count), first_seen: r.first_seen, last_seen: r.last_seen
            }));

            return res.json({
                success: true,
                data: {
                    anomalies_count: detected.length,
                    anomalies: detected,
                    period: period || '10m',
                    generated_at: new Date().toISOString()
                }
            });
        }

        // Raw log mode
        const where = {};
        if (since) {
            where.created_at = { [Op.gte]: new Date(Date.now() - parsePeriodMs(since)) };
        }
        if (action) {
            const actions = action.split(',').map(a => a.trim()).filter(Boolean);
            if (actions.length) where.action = { [Op.in]: actions };
        }

        const logs = await AuditLog.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 500
        });

        return res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Error in GET /admin/audit-logs (system):', error);
        return res.status(500).json({ success: false, message: 'Error fetching audit logs', error: error.message });
    }
}, authenticateToken, requireRoleLevel(80), auditLogController.getAuditLogs);

module.exports = router;
