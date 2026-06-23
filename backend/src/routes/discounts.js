const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const storeMiddleware = require('../middleware/storeMiddleware');

router.use(storeMiddleware);
router.use(requireAuth);

const requireManagerOrAbove = async (req, res, next) => {
    try {
        const { User, Role } = require('../models');
        const fullUser = await User.findByPk(req.user.id, {
            include: [{ model: Role, as: 'roles', through: { where: { is_active: true } } }]
        });
        const roles = fullUser?.roles || [];
        const allowed = roles.some(r =>
            ['admin', 'ceo', 'manager', 'superadmin'].includes(r.name)
            || r.level >= 60
        );
        if (!allowed) return res.status(403).json({ success: false, message: 'Acceso denegado' });
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error verificando permisos' });
    }
};

router.get('/fulfillment', requireManagerOrAbove, async (req, res) => {
    try {
        const { Store } = require('../models');
        const store = await Store.findByPk(req.store.id);
        const featuresCost = store.settings?.enterprise_config?.features?.shipping_cost
            ?? store.settings?.features?.shipping_cost;
        const shippingCost = parseFloat(store.shipping_cost) > 0
            ? parseFloat(store.shipping_cost)
            : (featuresCost != null ? parseFloat(featuresCost) : 4.99);

        res.json({
            success: true,
            data: {
                fulfillment_mode: store.fulfillment_mode || 'both',
                shipping_cost: shippingCost,
                pickup_schedule: store.pickup_schedule || null
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.patch('/fulfillment', requireManagerOrAbove, async (req, res) => {
    try {
        const { Store } = require('../models');
        const { fulfillment_mode, shipping_cost, pickup_schedule } = req.body;

        const validModes = ['shipping', 'pickup', 'both'];
        if (fulfillment_mode !== undefined && !validModes.includes(fulfillment_mode)) {
            return res.status(400).json({
                success: false,
                message: `fulfillment_mode debe ser uno de: ${validModes.join(', ')}`
            });
        }

        const store = await Store.findByPk(req.store.id);
        const updates = {};
        if (fulfillment_mode !== undefined) updates.fulfillment_mode = fulfillment_mode;
        if (shipping_cost !== undefined) updates.shipping_cost = parseFloat(shipping_cost);
        if (pickup_schedule !== undefined) updates.pickup_schedule = pickup_schedule;

        await store.update(updates);

        res.json({
            success: true,
            data: {
                fulfillment_mode: store.fulfillment_mode,
                shipping_cost: parseFloat(store.shipping_cost),
                pickup_schedule: store.pickup_schedule
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/shipping', requireManagerOrAbove, async (req, res) => {
    try {
        const { Store } = require('../models');
        const store = await Store.findByPk(req.store.id);
        const features = store.settings?.enterprise_config?.features || store.settings?.features || {};
        res.json({
            success: true,
            data: {
                free_shipping_disabled:  features.free_shipping_disabled  || false,
                free_shipping_threshold: features.free_shipping_threshold != null ? features.free_shipping_threshold : 50,
                shipping_cost:           features.shipping_cost           != null ? features.shipping_cost           : 4.99,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/shipping', requireManagerOrAbove, async (req, res) => {
    try {
        const { Store } = require('../models');
        const store = await Store.findByPk(req.store.id);
        const { free_shipping_disabled, free_shipping_threshold, shipping_cost } = req.body;

        const currentSettings = store.settings || {};
        const currentEC       = currentSettings.enterprise_config || {};
        const currentFeatures = currentEC.features || {};

        const updatedFeatures = {
            ...currentFeatures,
            ...(free_shipping_disabled  !== undefined && { free_shipping_disabled:  !!free_shipping_disabled }),
            ...(free_shipping_threshold !== undefined && { free_shipping_threshold: parseFloat(free_shipping_threshold) }),
            ...(shipping_cost           !== undefined && { shipping_cost:           parseFloat(shipping_cost) }),
        };

        await store.update({
            settings: {
                ...currentSettings,
                enterprise_config: {
                    ...currentEC,
                    features: updatedFeatures
                }
            }
        });

        res.json({ success: true, data: updatedFeatures });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/', requireManagerOrAbove, async (req, res) => {
    try {
        const { DiscountCode, Order } = require('../models');
        const codes = await DiscountCode.findAll({
            where: { store_id: req.store.id },
            order: [['created_at', 'DESC']]
        });
        const codesWithStats = await Promise.all(
            codes.map(async (code) => {
                const totalDiscounted = await Order.sum('discount_amount', {
                    where: { store_id: req.store.id, discount_code: code.code }
                });
                return {
                    ...code.toJSON(),
                    total_discounted: parseFloat(totalDiscounted || 0).toFixed(2)
                };
            })
        );
        res.json({ success: true, data: codesWithStats });
    } catch (err) {
        if (err.message?.includes('discount_code')) {
            try {
                const { DiscountCode } = require('../models');
                const codes = await DiscountCode.findAll({
                    where: { store_id: req.store.id },
                    order: [['created_at', 'DESC']]
                });
                return res.json({
                    success: true,
                    data: codes.map(c => ({ ...c.toJSON(), total_discounted: '0.00' }))
                });
            } catch (fallbackErr) {
                return res.status(500).json({ success: false, message: fallbackErr.message });
            }
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/', requireManagerOrAbove, async (req, res) => {
    try {
        const { DiscountCode } = require('../models');
        const { code, type, value, description, min_order_amount, max_uses, expires_at } = req.body;

        if (!code || !type || value === undefined) {
            return res.status(400).json({ success: false, message: 'code, type y value son obligatorios' });
        }

        const existing = await DiscountCode.findOne({
            where: { store_id: req.store.id, code: code.toUpperCase().trim() }
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Ya existe un código con ese nombre' });
        }

        const discount = await DiscountCode.create({
            store_id: req.store.id,
            code,
            type,
            value,
            description: description || null,
            min_order_amount: min_order_amount || 0,
            max_uses: max_uses || null,
            expires_at: expires_at || null,
            created_by: req.user.id
        });

        res.status(201).json({ success: true, data: discount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/:id', requireManagerOrAbove, async (req, res) => {
    try {
        const { DiscountCode } = require('../models');
        const discount = await DiscountCode.findOne({
            where: { id: req.params.id, store_id: req.store.id }
        });
        if (!discount) return res.status(404).json({ success: false, message: 'Código no encontrado' });

        const { code, type, value, description, min_order_amount, max_uses, expires_at, is_active } = req.body;

        if (code && code.toUpperCase().trim() !== discount.code) {
            const existing = await DiscountCode.findOne({
                where: { store_id: req.store.id, code: code.toUpperCase().trim() }
            });
            if (existing) return res.status(409).json({ success: false, message: 'Ya existe un código con ese nombre' });
        }

        await discount.update({
            ...(code !== undefined && { code }),
            ...(type !== undefined && { type }),
            ...(value !== undefined && { value }),
            ...(description !== undefined && { description }),
            ...(min_order_amount !== undefined && { min_order_amount }),
            ...(max_uses !== undefined && { max_uses }),
            ...(expires_at !== undefined && { expires_at }),
            ...(is_active !== undefined && { is_active })
        });

        res.json({ success: true, data: discount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/:id', requireManagerOrAbove, async (req, res) => {
    try {
        const { DiscountCode } = require('../models');
        const discount = await DiscountCode.findOne({
            where: { id: req.params.id, store_id: req.store.id }
        });
        if (!discount) return res.status(404).json({ success: false, message: 'Código no encontrado' });
        await discount.destroy();
        res.json({ success: true, message: 'Código eliminado' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
