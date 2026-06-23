const { Store, User, Product, Order, Customer, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// configuramos multer para subir logos de tienda (almacenamiento en memoria, máx 1MB)
const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        cb(null, allowed.includes(file.mimetype));
    }
}).single('logo');

// configuración de planes: define qué personalización de marca permite cada uno
const PLAN_FEATURES = {
    starter: {
        label: 'Esencial',
        canCustomLogo: false,
        canCustomColors: false,
        canCustomFavicon: false,
        description: 'Diseño estándar NeonHub'
    },
    installation: {
        label: 'Profesional',
        canCustomLogo: true,
        canCustomColors: true,
        canCustomFavicon: true,
        description: 'Diseño personalizado con tu marca'
    },
    enterprise: {
        label: 'Premium',
        canCustomLogo: true,
        canCustomColors: true,
        canCustomFavicon: true,
        description: 'Diseño exclusivo a medida'
    }
};

const TenantController = {

    
    createStore: async (req, res) => {
        try {
            const { name, subdomain, ceo_email, ceo_password } = req.body;

            const existingStore = await Store.findOne({ where: { subdomain } });
            if (existingStore) {
                return res.status(400).json({ error: 'Subdomain already exists' });
            }

            const existingUser = await User.findOne({ where: { email: ceo_email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists globally' });
            }

            const store = await Store.create({
                name,
                subdomain,
                settings: {
                    currency: 'EUR',
                    language: 'es'
                }
            });

            const hashedPassword = await bcrypt.hash(ceo_password, 12);
            const user = await User.create({
                store_id: store.id,
                first_name: 'CEO',
                last_name: name,
                username: subdomain + '_admin',
                email: ceo_email,
                password_hash: hashedPassword,
                is_active: true,
                email_verified: true
            });

            res.status(201).json({
                message: 'Store created successfully',
                store: {
                    id: store.id,
                    name: store.name,
                    subdomain: store.subdomain,
                    api_key_public: store.api_key_public
                },
                user: {
                    id: user.id,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Create Store Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    listStores: async (req, res) => {
        try {
            const stores = await Store.findAll({
                attributes: [
                    'id', 'name', 'subdomain', 'is_active', 'settings', 'created_at', 'updated_at',
                    'plan_id', 'plan_price_cents', 'billing_start_date', 'next_payment_date',
                    'payment_status', 'stripe_customer_id', 'stripe_subscription_id', 'paused_at', 'paused_reason',
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('users.id'))), 'userCount'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('products.id'))), 'productCount'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('orders.id'))), 'orderCount']
                ],
                include: [
                    { model: User, as: 'users', attributes: [], required: false },
                    { model: Product, as: 'products', attributes: [], required: false },
                    { model: Order, as: 'orders', attributes: [], required: false }
                ],
                group: ['Store.id'],
                order: [['created_at', 'DESC']]
            });

            res.json({
                success: true,
                data: stores
            });
        } catch (error) {
            console.error('List Stores Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    getStoreDetails: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id, {
                include: [
                    {
                        model: User,
                        as: 'users',
                        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'created_at']
                    }
                ]
            });

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            // obtenemos contadores adicionales
            const productCount = await Product.count({ where: { store_id: store.id } });
            const orderCount = await Order.count({ where: { store_id: store.id } });
            const customerCount = await Customer.count({ where: { store_id: store.id } });

            res.json({
                success: true,
                data: {
                    ...store.toJSON(),
                    stats: {
                        productCount,
                        orderCount,
                        customerCount,
                        userCount: store.users?.length || 0
                    }
                }
            });
        } catch (error) {
            console.error('Get Store Details Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    toggleStoreActive: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);

            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            // no permitimos desactivar la tienda "main"
            if (store.subdomain === 'main') {
                return res.status(400).json({ error: 'Cannot deactivate the main store' });
            }

            store.is_active = !store.is_active;
            if (store.is_active) {
                store.paused_at = null;
                store.paused_reason = null;
            }
            await store.save();

            res.json({
                success: true,
                message: `Store ${store.is_active ? 'activada' : 'desactivada'} correctamente`,
                data: {
                    id: store.id,
                    name: store.name,
                    is_active: store.is_active
                }
            });
        } catch (error) {
            console.error('Toggle Store Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    pauseStore: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);
            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }
            if (store.subdomain === 'main') {
                return res.status(400).json({ error: 'Cannot pause the main store' });
            }

            const { reason } = req.body || {};

            if (store.paused_at) {
                // Unpause
                store.is_active = true;
                store.paused_at = null;
                store.paused_reason = null;
                await store.save();
                return res.json({
                    success: true,
                    message: 'Servicio reactivado correctamente',
                    data: { id: store.id, name: store.name, is_active: true, paused_at: null }
                });
            } else {
                // Pause
                store.is_active = false;
                store.paused_at = new Date();
                store.paused_reason = reason || 'Pausado por administrador';
                await store.save();
                return res.json({
                    success: true,
                    message: 'Servicio pausado correctamente',
                    data: { id: store.id, name: store.name, is_active: false, paused_at: store.paused_at, paused_reason: store.paused_reason }
                });
            }
        } catch (error) {
            console.error('Pause Store Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    deleteStore: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);
            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }
            if (store.subdomain === 'main') {
                return res.status(400).json({ error: 'Cannot delete the main store' });
            }

            // primero desactivamos y luego hacemos soft-delete
            store.is_active = false;
            await store.save();
            await store.destroy(); // paranoid: true → sets deletedAt

            res.json({
                success: true,
                message: `Empresa "${store.name}" eliminada correctamente`,
                data: { id: store.id, name: store.name }
            });
        } catch (error) {
            console.error('Delete Store Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    updatePaymentStatus: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);
            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            const { payment_status, next_payment_date } = req.body;

            const validStatuses = ['paid', 'pending', 'overdue', 'cancelled', 'trial'];
            if (payment_status && !validStatuses.includes(payment_status)) {
                return res.status(400).json({ error: `Estado inválido. Válidos: ${validStatuses.join(', ')}` });
            }

            const updates = {};
            if (payment_status) updates.payment_status = payment_status;
            if (next_payment_date) updates.next_payment_date = next_payment_date;

            // If marked as paid, advance next_payment_date by 1 month
            if (payment_status === 'paid' && !next_payment_date) {
                const nextDate = new Date(store.next_payment_date || new Date());
                nextDate.setMonth(nextDate.getMonth() + 1);
                updates.next_payment_date = nextDate.toISOString().split('T')[0];
            }

            // si se cancela, desactivamos la tienda
            if (payment_status === 'cancelled') {
                updates.is_active = false;
            }

            await store.update(updates);

            res.json({
                success: true,
                message: 'Estado de pago actualizado',
                data: {
                    id: store.id,
                    name: store.name,
                    payment_status: store.payment_status,
                    next_payment_date: store.next_payment_date,
                    is_active: store.is_active
                }
            });
        } catch (error) {
            console.error('Update Payment Status Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    getStoreBranding: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);
            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            const planId = store.plan_id || 'starter';
            const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES.starter;

            res.json({
                success: true,
                data: {
                    store_id: store.id,
                    store_name: store.name,
                    plan_id: planId,
                    plan: planFeatures,
                    branding: {
                        logo_url: store.settings?.branding?.logo_url || null,
                        favicon_url: store.settings?.branding?.favicon_url || null,
                        primary_color: store.settings?.branding?.primary_color || store.settings?.theme?.primaryColor || '#0ea5e9',
                        secondary_color: store.settings?.branding?.secondary_color || '#6366f1',
                        accent_color: store.settings?.branding?.accent_color || '#22d3ee',
                        dark_mode: store.settings?.theme?.darkMode ?? true,
                        store_description: store.settings?.branding?.store_description || '',
                        custom_css: store.settings?.branding?.custom_css || ''
                    }
                }
            });
        } catch (error) {
            console.error('Get Store Branding Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    updateStoreBranding: async (req, res) => {
        try {
            const store = await Store.findByPk(req.params.id);
            if (!store) {
                return res.status(404).json({ error: 'Store not found' });
            }

            const planId = store.plan_id || 'starter';
            const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES.starter;

            const { primary_color, secondary_color, accent_color, dark_mode, store_description, custom_css } = req.body;

            // validamos el formato del color
            const colorRegex = /^#[0-9a-fA-F]{6}$/;
            if (primary_color && !colorRegex.test(primary_color)) {
                return res.status(400).json({ error: 'Color primario inválido (formato: #RRGGBB)' });
            }
            if (secondary_color && !colorRegex.test(secondary_color)) {
                return res.status(400).json({ error: 'Color secundario inválido (formato: #RRGGBB)' });
            }
            if (accent_color && !colorRegex.test(accent_color)) {
                return res.status(400).json({ error: 'Color de acento inválido (formato: #RRGGBB)' });
            }

            // comprobamos los permisos del plan
            if (!planFeatures.canCustomColors && (primary_color || secondary_color || accent_color)) {
                return res.status(403).json({
                    error: `El plan ${planFeatures.label} no incluye colores personalizados. Necesita el plan Profesional o superior.`
                });
            }

            // Build updated settings
            const currentSettings = store.settings || {};
            const currentBranding = currentSettings.branding || {};

            const updatedBranding = {
                ...currentBranding,
                ...(primary_color && { primary_color }),
                ...(secondary_color && { secondary_color }),
                ...(accent_color && { accent_color }),
                ...(store_description !== undefined && { store_description }),
                ...(custom_css !== undefined && planId !== 'starter' && { custom_css })
            };

            const updatedSettings = {
                ...currentSettings,
                branding: updatedBranding,
                theme: {
                    ...currentSettings.theme,
                    ...(primary_color && { primaryColor: primary_color }),
                    ...(dark_mode !== undefined && { darkMode: dark_mode })
                }
            };

            await store.update({ settings: updatedSettings });

            res.json({
                success: true,
                message: 'Branding actualizado correctamente',
                data: {
                    store_id: store.id,
                    store_name: store.name,
                    plan_id: planId,
                    branding: updatedBranding
                }
            });
        } catch (error) {
            console.error('Update Store Branding Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    
    uploadStoreLogo: async (req, res) => {
        logoUpload(req, res, async (err) => {
            try {
                if (err) {
                    return res.status(400).json({ error: 'Error al subir el logo: ' + err.message });
                }

                const store = await Store.findByPk(req.params.id);
                if (!store) {
                    return res.status(404).json({ error: 'Store not found' });
                }

                const planId = store.plan_id || 'starter';
                const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES.starter;

                if (!planFeatures.canCustomLogo) {
                    return res.status(403).json({
                        error: `El plan ${planFeatures.label} no incluye logo personalizado. Necesita el plan Profesional o superior.`
                    });
                }

                if (!req.file) {
                    return res.status(400).json({ error: 'No se proporcionó archivo de logo' });
                }

                // Save logo to store-specific directory
                const logoDir = path.join(__dirname, '../../uploads/stores', store.id);
                await fs.mkdir(logoDir, { recursive: true });

                const logoFilename = `logo_${Date.now()}.webp`;
                const logoPath = path.join(logoDir, logoFilename);

                // Process logo: resize to max 400x400, convert to WebP
                if (req.file.mimetype === 'image/svg+xml') {
                    // Keep SVG as-is
                    const svgFilename = `logo_${Date.now()}.svg`;
                    await fs.writeFile(path.join(logoDir, svgFilename), req.file.buffer);
                    
                    const logoUrl = `/uploads/stores/${store.id}/${svgFilename}`;
                    const currentSettings = store.settings || {};
                    await store.update({
                        settings: {
                            ...currentSettings,
                            branding: { ...currentSettings.branding, logo_url: logoUrl }
                        }
                    });

                    return res.json({
                        success: true,
                        message: 'Logo actualizado',
                        data: { logo_url: logoUrl }
                    });
                }

                await sharp(req.file.buffer)
                    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 85 })
                    .toFile(logoPath);

                const logoUrl = `/uploads/stores/${store.id}/${logoFilename}`;

                // actualizamos la configuración de la tienda
                const currentSettings = store.settings || {};
                await store.update({
                    settings: {
                        ...currentSettings,
                        branding: { ...currentSettings.branding, logo_url: logoUrl }
                    }
                });

                res.json({
                    success: true,
                    message: 'Logo actualizado correctamente',
                    data: { logo_url: logoUrl }
                });
            } catch (error) {
                console.error('Upload Store Logo Error:', error);
                res.status(500).json({ error: error.message });
            }
        });
    },

    
    getPlanFeatures: (req, res) => {
        res.json({
            success: true,
            data: PLAN_FEATURES
        });
    }
};

module.exports = TenantController;
