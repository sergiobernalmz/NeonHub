const { Store } = require('../models');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PLAN_LEVELS = { starter: 1, installation: 2, enterprise: 3 };

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato no soportado. Usa JPG, PNG, WebP o GIF'), false);
  }
});

async function processStoreImage(buffer, storeId, type) {
  const dir = path.join(__dirname, '../../uploads/stores', storeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${type}-${Date.now()}.webp`;
  const outputPath = path.join(dir, filename);
  const dimensions = type === 'favicon' ? { width: 64, height: 64 } : { width: 800, height: 800 };

  await sharp(buffer)
    .resize(dimensions.width, dimensions.height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outputPath);

  return `/uploads/stores/${storeId}/${filename}`;
}

const getMyStore = async (req, res) => {
  try {
    if (!req.tenant?.id) {
      return res.status(403).json({ success: false, message: 'Contexto de tienda requerido' });
    }
    const store = await Store.findByPk(req.tenant.id, {
      attributes: ['id', 'name', 'plan_id', 'settings']
    });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
    }
    return res.json({
      success: true,
      data: { id: store.id, name: store.name, plan_id: store.plan_id, settings: store.settings }
    });
  } catch (error) {
    console.error('getMyStore error:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la tienda' });
  }
};

const updateMyStore = async (req, res) => {
  try {
    if (!req.tenant?.id) {
      return res.status(403).json({ success: false, message: 'Contexto de tienda requerido' });
    }
    const store = await Store.findByPk(req.tenant.id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
    }

    const {
      name, dashboard_name, description, currency, language,
      hero_title, hero_subtitle,
      primary_color, secondary_color, accent_color, bg_color,
      design_layout, design_button_radius, design_font,
      gradient_enabled, gradient_from, gradient_to, gradient_direction,
      announcement_enabled, announcement_text, announcement_color,
      custom_css,
    } = req.body;
    const logoFile           = req.files?.logo?.[0];
    const faviconFile        = req.files?.favicon?.[0];
    const dashboardLogoFile  = req.files?.dashboard_logo?.[0];
    const dashboardFavFile   = req.files?.dashboard_favicon?.[0];

    // Process uploaded images
    let logoUrl, faviconUrl, dashboardLogoUrl, dashboardFavUrl;
    if (logoFile)          logoUrl          = await processStoreImage(logoFile.buffer,          store.id, 'logo');
    if (faviconFile)       faviconUrl       = await processStoreImage(faviconFile.buffer,       store.id, 'favicon');
    if (dashboardLogoFile) dashboardLogoUrl = await processStoreImage(dashboardLogoFile.buffer, store.id, 'dashboard-logo');
    if (dashboardFavFile)  dashboardFavUrl  = await processStoreImage(dashboardFavFile.buffer,  store.id, 'dashboard-favicon');

    const updates = {};
    if (name !== undefined) updates.name = name;

    const currentSettings = store.settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...(language && { language }),
      ...(currency && { currency }),
      branding: {
        ...(currentSettings.branding || {}),
        ...(dashboard_name   !== undefined && { dashboard_name }),
        ...(description      !== undefined && { store_description: description }),
        ...(hero_title       !== undefined && { hero_title }),
        ...(hero_subtitle    !== undefined && { hero_subtitle }),
        ...(logoUrl          && { logo_url:              logoUrl }),
        ...(faviconUrl       && { favicon_url:           faviconUrl }),
        ...(dashboardLogoUrl && { dashboard_logo_url:    dashboardLogoUrl }),
        ...(dashboardFavUrl  && { dashboard_favicon_url: dashboardFavUrl }),
        ...(primary_color   !== undefined && { primary_color }),
        ...(secondary_color !== undefined && { secondary_color }),
        ...(accent_color    !== undefined && { accent_color }),
        ...(bg_color        !== undefined && { bg_color }),
      },
      design: {
        ...(currentSettings.design || {}),
        ...(design_layout        !== undefined && { layout:        design_layout }),
        ...(design_button_radius !== undefined && { button_radius: design_button_radius }),
        ...(design_font          !== undefined && { font:          design_font }),
      },
      enterprise_config: {
        ...(currentSettings.enterprise_config || {}),
        design: {
          ...(currentSettings.enterprise_config?.design || {}),
          ...(gradient_enabled    !== undefined && { gradient_enabled:     gradient_enabled === 'true' || gradient_enabled === true }),
          ...(gradient_from       !== undefined && { gradient_from }),
          ...(gradient_to         !== undefined && { gradient_to }),
          ...(gradient_direction  !== undefined && { gradient_direction }),
          ...(announcement_enabled !== undefined && { announcement_enabled: announcement_enabled === 'true' || announcement_enabled === true }),
          ...(announcement_text   !== undefined && { announcement_text }),
          ...(announcement_color  !== undefined && { announcement_color }),
          ...(custom_css          !== undefined && { custom_css }),
        },
      },
    };

    updates.settings = updatedSettings;
    await store.update(updates);

    return res.json({
      success: true,
      data: { id: store.id, name: store.name, plan_id: store.plan_id, settings: updatedSettings }
    });
  } catch (error) {
    console.error('updateMyStore error:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar la tienda' });
  }
};

const DEFAULT_FEATURES = {
  products: true, gallery: true, orders: true, customers: true,
  analytics: false, sustainability: false, reports: false,
  invoices: false, tickets: false, certifications: false,
  discounts: false,
};

const BASE_FEATURES = ['products', 'orders', 'customers'];

const getMyStoreFeatures = async (req, res) => {
  try {
    if (!req.tenant?.id) return res.status(403).json({ success: false, message: 'Contexto de tienda requerido' });
    const store = await Store.findByPk(req.tenant.id, { attributes: ['settings'] });
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
    const storeFeatures = {
      ...DEFAULT_FEATURES,
      ...(store.settings?.enterprise_config?.features || {})
    };
    return res.json({ success: true, data: storeFeatures });
  } catch (error) {
    console.error('getMyStoreFeatures error:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener features' });
  }
};

const updateMyStoreFeatures = async (req, res) => {
  try {
    if (!req.tenant?.id) return res.status(403).json({ success: false, message: 'Contexto de tienda requerido' });
    const store = await Store.findByPk(req.tenant.id);
    if (!store) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

    const incoming = req.body.features || {};
    BASE_FEATURES.forEach(k => { if (k in incoming) incoming[k] = true; });

    const currentSettings = store.settings || {};
    const currentFeatures = currentSettings.enterprise_config?.features || {};
    const updatedFeatures = { ...DEFAULT_FEATURES, ...currentFeatures, ...incoming };

    const updatedSettings = {
      ...currentSettings,
      enterprise_config: {
        ...(currentSettings.enterprise_config || {}),
        features: updatedFeatures
      }
    };
    await store.update({ settings: updatedSettings });
    return res.json({ success: true, data: updatedFeatures });
  } catch (error) {
    console.error('updateMyStoreFeatures error:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar features' });
  }
};

module.exports = { getMyStore, updateMyStore, upload, getMyStoreFeatures, updateMyStoreFeatures };
