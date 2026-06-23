'use strict';
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const path = require('path');
const fs = require('fs');

const SID = '75cf2d3d-f22e-4ac1-805f-5da02e9c70b0'; // demo store id
const SNAPSHOT_PATH = path.join(__dirname, '../data/demo_seed_snapshot.json');

// ── Extra customers (10 adicionales sobre los 10 del snapshot) ─────────────
const EXTRA_CUSTS = [
  { id: 'c0000001-0000-4000-8000-000000000001', code: 'C011', fn: 'Ana',     ln: 'Martínez Ruiz',    email: 'ana.martinez@ejemplo.es',     phone: '+34 611 111 001', city: 'Barcelona',  cp: '08001' },
  { id: 'c0000002-0000-4000-8000-000000000002', code: 'C012', fn: 'Carlos',  ln: 'López Fernández',  email: 'carlos.lopez@ejemplo.es',     phone: '+34 622 222 002', city: 'Madrid',     cp: '28001' },
  { id: 'c0000003-0000-4000-8000-000000000003', code: 'C013', fn: 'Isabel',  ln: 'González Sánchez', email: 'isabel.gonzalez@ejemplo.es',  phone: '+34 633 333 003', city: 'Valencia',   cp: '46001' },
  { id: 'c0000004-0000-4000-8000-000000000004', code: 'C014', fn: 'Javier',  ln: 'Rodríguez Pérez',  email: 'javier.rodriguez@ejemplo.es', phone: '+34 644 444 004', city: 'Sevilla',    cp: '41001' },
  { id: 'c0000005-0000-4000-8000-000000000005', code: 'C015', fn: 'Laura',   ln: 'Hernández García', email: 'laura.hernandez@ejemplo.es',  phone: '+34 655 555 005', city: 'Zaragoza',   cp: '50001' },
  { id: 'c0000006-0000-4000-8000-000000000006', code: 'C016', fn: 'Miguel',  ln: 'Díaz Moreno',      email: 'miguel.diaz@ejemplo.es',      phone: '+34 666 666 006', city: 'Málaga',     cp: '29001' },
  { id: 'c0000007-0000-4000-8000-000000000007', code: 'C017', fn: 'Sofía',   ln: 'Álvarez Jiménez',  email: 'sofia.alvarez@ejemplo.es',    phone: '+34 677 777 007', city: 'Murcia',     cp: '30001' },
  { id: 'c0000008-0000-4000-8000-000000000008', code: 'C018', fn: 'Pablo',   ln: 'Romero Gutiérrez', email: 'pablo.romero@ejemplo.es',     phone: '+34 688 888 008', city: 'Palma',      cp: '07001' },
  { id: 'c0000009-0000-4000-8000-000000000009', code: 'C019', fn: 'Elena',   ln: 'Torres Navarro',   email: 'elena.torres@ejemplo.es',     phone: '+34 699 999 009', city: 'Las Palmas', cp: '35001' },
  { id: 'c000000a-0000-4000-8000-00000000000a', code: 'C020', fn: 'Roberto', ln: 'Vega Castillo',    email: 'roberto.vega@ejemplo.es',     phone: '+34 600 000 010', city: 'Bilbao',     cp: '48001' },
];

// Productos del demo store usados para los 65 pedidos extra [id, precio]:
const EP = [
  ['05d7ec58-b696-4ed9-9a0c-9e04660f3ceb', 1199.00], // iPhone 15 Pro
  ['9f9308c8-1a23-4502-86f9-02387f6e7f61',  349.00], // Sony WH-1000XM5
  ['8685b9ad-5487-4d59-9a12-199b2bd24a68',  339.00], // Nintendo Switch OLED
  ['2f043d6f-76fd-46ff-ac35-28ffd6380971',  279.00], // AirPods Pro
  ['f57db08f-5a60-4c54-aedf-ce6f3077e7df',  149.00], // Xbox Elite Controller
  ['9a4e02b4-12d0-422c-9cf2-d2378607113f',  129.00], // HyperX Cloud Alpha
  ['8947581e-2996-42b8-9320-33b7b35b8e06',   89.00], // Razer DeathAdder V3
  ['cfbae716-d90d-4144-9958-fa301acd2372',   69.00], // PS5 DualSense
  ['12a43e94-6a6d-4352-8693-55ce4452edc7',   59.00], // Belkin Hub USB-C
  ['28bf6e0a-d5ef-4f21-be0f-77de72bba4cf',   49.00], // Samsung Cargador
];

// Distribución de 65 pedidos: i 0-4 cancelados, 5-14 procesando, 15-24 enviados, 25-64 completados
function orderStatus(i) {
  if (i < 5)  return 'cancelled';
  if (i < 15) return 'processing';
  if (i < 25) return 'shipped';
  return 'completed';
}
function orderPayStatus(s) {
  if (s === 'cancelled')  return 'refunded';
  if (s === 'processing') return 'pending_payment';
  return 'paid';
}
function orderDaysAgo(i) {
  if (i < 5)  return [78, 61, 43, 28, 13][i];
  if (i < 15) return Math.round(8  - ((i - 5)  / 9)  * 7);   // 8→1
  if (i < 25) return Math.round(22 - ((i - 15) / 9)  * 16);  // 22→6
  return      Math.round(89 - ((i - 25) / 39) * 74);          // 89→15
}

// 3 códigos de descuento seed:
const SEED_DISCOUNTS = [
  { id: 'dc000001-0000-4000-8000-000000000001', code: 'BIENVENIDO10', type: 'percentage', value: 10.00, desc: 'Descuento de bienvenida 10%', min: 0,  maxUses: '100',  used: 23 },
  { id: 'dc000002-0000-4000-8000-000000000002', code: 'VERANO20',     type: 'percentage', value: 20.00, desc: 'Oferta de verano 20%',         min: 30, maxUses: '50',   used: 7  },
  { id: 'dc000003-0000-4000-8000-000000000003', code: 'FIJO5',        type: 'fixed',      value: 5.00,  desc: 'Descuento fijo 5€',            min: 50, maxUses: 'NULL', used: 15 },
];

// 5 tickets de soporte seed:
const SEED_TICKETS = [
  {
    id: 'bc000001-0000-4000-8000-000000000001',
    email: 'carlos.lopez@ejemplo.es',
    subject: '¿Cuándo llega mi pedido DX-0018?',
    message: 'Hola, realicé el pedido hace 3 días y todavía no tengo información de envío. ¿Podéis ayudarme?',
    status: 'open', priority: 'normal', responses: '[]',
    rbc: true, rba: false, days: 2,
  },
  {
    id: 'bc000002-0000-4000-8000-000000000002',
    email: 'laura.hernandez@ejemplo.es',
    subject: 'Producto llegó dañado',
    message: 'El Nintendo Switch llegó con la pantalla rayada. Necesito una devolución o reemplazo urgente.',
    status: 'in_progress', priority: 'high',
    responses: JSON.stringify([{ author: 'admin', message: 'Lamentamos el inconveniente. Hemos iniciado el proceso de devolución y recibirás el reemplazo en 3-5 días hábiles.', created_at: new Date(Date.now() - 86400000).toISOString() }]),
    rbc: false, rba: true, days: 5,
  },
  {
    id: 'bc000003-0000-4000-8000-000000000003',
    email: 'ana.martinez@ejemplo.es',
    subject: 'Consulta sobre descuentos para empresas',
    message: '¿Ofrecéis descuentos para compras de más de 10 unidades? Somos una empresa y nos interesa el volumen.',
    status: 'resolved', priority: 'low',
    responses: JSON.stringify([{ author: 'admin', message: 'Hola Ana, sí disponemos de precios especiales para empresas. Usa el código VERANO20 por ahora y contáctanos para un presupuesto personalizado.', created_at: new Date(Date.now() - 7*86400000).toISOString() }]),
    rbc: true, rba: true, days: 10,
  },
  {
    id: 'bc000004-0000-4000-8000-000000000004',
    email: 'miguel.diaz@ejemplo.es',
    subject: 'No puedo iniciar sesión en mi cuenta',
    message: 'Intenté cambiar mi contraseña pero el enlace de recuperación no funciona. Llevo dos días sin acceso.',
    status: 'open', priority: 'urgent', responses: '[]',
    rbc: true, rba: false, days: 1,
  },
  {
    id: 'bc000005-0000-4000-8000-000000000005',
    email: 'pablo.romero@ejemplo.es',
    subject: 'Factura incorrecta en pedido DX-0033',
    message: 'La factura tiene una dirección fiscal incorrecta. Necesito que la modifiquen para la deducción fiscal.',
    status: 'in_progress', priority: 'normal',
    responses: JSON.stringify([{ author: 'admin', message: 'Hemos recibido tu solicitud. En breve te enviaremos la factura rectificativa por email.', created_at: new Date(Date.now() - 86400000).toISOString() }]),
    rbc: true, rba: true, days: 3,
  },
];

class DemoTenantService {
  constructor() {
    this.isRunning = false;
  }

  _loadSnapshot() {
    try {
      return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    } catch (_e) {
      return null;
    }
  }

  async _seedExists() {
    const snap = this._loadSnapshot();
    if (!snap?.categories?.length) return false;
    const [rows] = await sequelize.query(
      'SELECT id FROM categories WHERE id = :id AND store_id = :sid',
      { replacements: { id: snap.categories[0].id, sid: SID } }
    );
    return rows.length > 0;
  }

  async seedDemoTenant() {
    try {
      const snap = this._loadSnapshot();
      if (!snap || !(await this._seedExists())) {
        console.log('⚠️  [Demo] Snapshot no encontrado. Ejecuta: node src/database/seeds/demo-store-seed.js');
        return;
      }

      console.log('🔄 [Demo] Iniciando reset...');

      const seedCatIds   = snap.categories.map(r => r.id);
      const seedProdIds  = snap.products.map(r => r.id);
      const seedCustIds  = snap.customers.map(r => r.id);
      const seedOrderIds = snap.orders.map(r => r.id);
      const idList = ids => ids.map(id => `'${id}'`).join(',');
      const run = (q, r) => sequelize.query(q, { replacements: r });

      // 1. Borrar order_items no-seed
      await run(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id=:sid AND id NOT IN (${idList(seedOrderIds)}))`, { sid: SID });
      // 2. Borrar pedidos no-seed
      await run(`DELETE FROM orders WHERE store_id=:sid AND id NOT IN (${idList(seedOrderIds)})`, { sid: SID });
      // 3. Borrar clientes no-seed
      await run(`DELETE FROM customers WHERE store_id=:sid AND id NOT IN (${idList(seedCustIds)})`, { sid: SID });
      // 4. Borrar productos no-seed
      await run(`DELETE FROM products WHERE store_id=:sid AND id NOT IN (${idList(seedProdIds)})`, { sid: SID });
      // 5. Borrar categorías no-seed
      await run(`DELETE FROM categories WHERE store_id=:sid AND id NOT IN (${idList(seedCatIds)})`, { sid: SID });

      // 6. Restaurar productos seed
      for (const p of snap.products) {
        await sequelize.query(
          `UPDATE products SET name=$1, slug=$2, price=$3, cost_price=$4, compare_price=$5,
            stock_quantity=$6, description=$7, is_active=true, deleted_at=NULL, updated_at=NOW()
           WHERE id=$8 AND store_id='${SID}'`,
          { bind: [p.name, p.slug, p.price, p.cost_price, p.compare_price, p.stock_quantity, p.description, p.id] }
        );
      }

      // 7. Restaurar categorías seed
      for (const c of snap.categories) {
        await sequelize.query(
          `UPDATE categories SET name=$1, slug=$2, color=$3, icon=$4, sort_order=$5, is_active=true, deleted_at=NULL, updated_at=NOW()
           WHERE id=$6 AND store_id='${SID}'`,
          { bind: [c.name, c.slug, c.color, c.icon, c.sort_order, c.id] }
        );
      }

      // 8. Restaurar pedidos seed con timestamps distribuidos en 90 días
      const orderCount = snap.orders.length;
      for (let idx = 0; idx < orderCount; idx++) {
        const o = snap.orders[idx];
        const d = Math.floor((idx / orderCount) * 90);
        await sequelize.query(
          `UPDATE orders SET status=$1, payment_status=$2, subtotal=$3, tax_amount=$4,
            discount_amount=$5, shipping_amount=$6, total_amount=$7, deleted_at=NULL,
            updated_at=NOW(), created_at=NOW()-INTERVAL '${d} days', order_date=NOW()-INTERVAL '${d} days'
           WHERE id=$8 AND store_id='${SID}'`,
          { bind: [o.status, o.payment_status, o.subtotal, o.tax_amount, o.discount_amount, o.shipping_amount, o.total_amount, o.id] }
        );
      }

      // 9. Restaurar order_items seed
      await sequelize.query(`DELETE FROM order_items WHERE order_id IN (${idList(seedOrderIds)})`);
      for (const item of snap.order_items) {
        await sequelize.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_rate, tax_rate, line_total, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
           ON CONFLICT (id) DO UPDATE SET quantity=EXCLUDED.quantity, line_total=EXCLUDED.line_total, updated_at=NOW()`,
          { bind: [item.id, item.order_id, item.product_id, item.quantity, item.unit_price, item.discount_rate, item.tax_rate, item.line_total] }
        );
      }

      // 10. Limpiar + re-sembrar discount_codes y support_tickets
      await run('DELETE FROM discount_codes WHERE store_id=:sid', { sid: SID });
      await run('DELETE FROM support_tickets WHERE store_id=:sid', { sid: SID });

      for (const d of SEED_DISCOUNTS) {
        await sequelize.query(
          `INSERT INTO discount_codes (id, store_id, code, type, value, description, min_order_amount, max_uses, used_count, is_active, expires_at, created_at, updated_at)
           VALUES (:id,:sid,:code,:type,:value,:desc,:min,${d.maxUses},:used,true,NOW()+INTERVAL '60 days',NOW()-INTERVAL '30 days',NOW())`,
          { replacements: { id: d.id, sid: SID, code: d.code, type: d.type, value: d.value, desc: d.desc, min: d.min, used: d.used } }
        );
      }

      for (const t of SEED_TICKETS) {
        await sequelize.query(
          `INSERT INTO support_tickets (id, store_id, customer_email, subject, message, status, priority, ticket_type, responses, read_by_customer, read_by_admin, created_at, updated_at)
           VALUES (:id,:sid,:email,:subject,:message,:status,:priority,'store_support',:responses::jsonb,:rbc,:rba,NOW()-INTERVAL '${t.days} days',NOW()-INTERVAL '${Math.max(0,t.days-1)} days')`,
          { replacements: { id: t.id, sid: SID, email: t.email, subject: t.subject, message: t.message, status: t.status, priority: t.priority, responses: t.responses, rbc: t.rbc, rba: t.rba } }
        );
      }

      // 11. Restaurar settings (features: solo products/orders/customers/gallery activos)
      const demoSettings = JSON.stringify({
        currency: 'EUR', language: 'es',
        branding: {
          appName: 'Demo Sostenible', dashboard_name: 'Demo Sostenible',
          store_description: 'Tienda de demostración de NeonHub. Explora todas las funcionalidades de NeonHub.',
          hero_title: null, hero_subtitle: null,
          logo_url: null, favicon_url: null, dashboard_logo_url: null, dashboard_favicon_url: null,
          primary_color: '#38bdf8', secondary_color: '#0284c7', accent_color: '#7dd3fc', bg_color: '#020617',
        },
        design: { layout: 'modern', button_radius: 'pill', font: 'default' },
        enterprise_config: {
          features: {
            products: true, orders: true, customers: true, gallery: true,
            analytics: false, sustainability: false, reports: false,
            invoices: false, tickets: false, certifications: false, discounts: false,
          },
          design: {
            gradient_enabled: true, gradient_from: '#020617', gradient_to: '#0a1a3a',
            gradient_direction: 'to bottom right', announcement_enabled: false,
            announcement_text: null, announcement_color: null, custom_css: null,
          },
          sections: {}, limits: {},
        },
      });
      await run(`UPDATE stores SET settings=:settings::json, updated_at=NOW() WHERE id=:sid`, { settings: demoSettings, sid: SID });
      await run(`UPDATE stores SET name='Demo Sostenible', subdomain='demo', updated_at=NOW() WHERE id=:sid`, { sid: SID });

      // 12. Restaurar usuario demo
      const demoHash = await bcrypt.hash('Demo1234!', 10);
      await sequelize.query(
        `UPDATE users SET username='demo', first_name='Demo', last_name='User',
          password_hash=:hash, is_active=true, email_verified=true, deleted_at=NULL,
          password_reset_token=NULL, password_reset_expires=NULL, updated_at=NOW()
         WHERE email='demo@neonhub.es'`,
        { replacements: { hash: demoHash } }
      );

      // 13. Limpiar sesiones/notificaciones del demo user
      await sequelize.query(`DELETE FROM user_sessions WHERE user_id=(SELECT id FROM users WHERE email='demo@neonhub.es')`);
      await sequelize.query(`DELETE FROM notifications WHERE user_id=(SELECT id FROM users WHERE email='demo@neonhub.es')`);
      await sequelize.query(`DELETE FROM sso_tokens WHERE user_id=(SELECT id FROM users WHERE email='demo@neonhub.es')`).catch(() => {});
      await run(`UPDATE user_permissions SET permissions='{}', updated_at=NOW() WHERE user_id=(SELECT id FROM users WHERE email='demo@neonhub.es') AND store_id=:sid`, { sid: SID }).catch(() => {});

      // 14. Asegurar rol CEO
      await sequelize.query(
        `INSERT INTO user_roles (id, user_id, role_id, store_id, is_active, assigned_at, created_at, updated_at)
         SELECT gen_random_uuid(),(SELECT id FROM users WHERE email='demo@neonhub.es'),(SELECT id FROM roles WHERE name='ceo' LIMIT 1),:sid,true,NOW(),NOW(),NOW()
         WHERE EXISTS(SELECT 1 FROM users WHERE email='demo@neonhub.es') AND EXISTS(SELECT 1 FROM roles WHERE name='ceo')
         ON CONFLICT (user_id, role_id, store_id) DO UPDATE SET is_active=true, updated_at=NOW()`,
        { replacements: { sid: SID } }
      );

      // 15. Asegurar user_stores
      await sequelize.query(
        `INSERT INTO user_stores (user_id, store_id)
         SELECT (SELECT id FROM users WHERE email='demo@neonhub.es'),:sid WHERE EXISTS(SELECT 1 FROM users WHERE email='demo@neonhub.es')
         ON CONFLICT (user_id, store_id) DO NOTHING`,
        { replacements: { sid: SID } }
      );

      // 16. Insertar 10 clientes extra
      for (const c of EXTRA_CUSTS) {
        const addr = JSON.stringify({ street: '', city: c.city, state: '', postal_code: c.cp, country: 'ES' });
        await sequelize.query(
          `INSERT INTO customers (id, store_id, customer_code, first_name, last_name, email, phone,
             billing_address, shipping_address, customer_type, is_active, credit_limit, payment_terms, discount_rate, created_at, updated_at)
           VALUES (:id,:sid,:code,:fn,:ln,:email,:phone,:addr::json,:addr::json,'individual',true,0,30,0,NOW()-INTERVAL '60 days',NOW())
           ON CONFLICT (id) DO UPDATE SET updated_at=NOW()`,
          { replacements: { id: c.id, sid: SID, code: c.code, fn: c.fn, ln: c.ln, email: c.email, phone: c.phone, addr } }
        );
      }

      // 17. Insertar 65 pedidos extra + order_items
      for (let i = 0; i < 65; i++) {
        const h      = (i + 1).toString(16).padStart(8, '0');
        const ordId  = `${h}-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
        const itmId  = `${h}-0001-4000-8000-${String(i+1).padStart(12,'0')}`;
        const custId = EXTRA_CUSTS[i % EXTRA_CUSTS.length].id;
        const [prodId, prodPrice] = EP[i % EP.length];
        const qty      = (i % 3 === 0) ? 2 : 1;
        const subtotal = Math.round(prodPrice * qty * 100) / 100;
        const tax      = Math.round(subtotal * 0.21 * 100) / 100;
        const total    = Math.round((subtotal + tax) * 100) / 100;
        const status   = orderStatus(i);
        const days     = orderDaysAgo(i);
        const num      = `DX-${String(i + 1).padStart(4, '0')}`;

        await sequelize.query(
          `INSERT INTO orders (id, store_id, order_number, customer_id, status, order_date,
             subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
             currency, payment_status, payment_method, created_at, updated_at)
           VALUES (:id,:sid,:num,:cid,:status,NOW()-INTERVAL '${days} days',
             :sub,:tax,0,0,:total,'EUR',:pay,'stripe',NOW()-INTERVAL '${days} days',NOW())
           ON CONFLICT (order_number) DO UPDATE SET status=EXCLUDED.status, total_amount=EXCLUDED.total_amount, updated_at=NOW()`,
          { replacements: { id: ordId, sid: SID, num, cid: custId, status, sub: subtotal, tax, total, pay: orderPayStatus(status) } }
        );

        await sequelize.query(
          `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_rate, tax_rate, line_total, created_at, updated_at)
           VALUES (:id,:oid,:pid,:qty,:price,0,0.21,:line,NOW()-INTERVAL '${days} days',NOW())
           ON CONFLICT (id) DO UPDATE SET quantity=EXCLUDED.quantity, line_total=EXCLUDED.line_total, updated_at=NOW()`,
          { replacements: { id: itmId, oid: ordId, pid: prodId, qty, price: prodPrice, line: total } }
        );
      }

      console.log('✅ [Demo] Reset completo: 20 clientes, 80 pedidos, 3 descuentos, 5 tickets.');
    } catch (error) {
      console.error('❌ [Demo] Error en reset:', error.message, error.stack?.split('\n')[1] || '');
    }
  }

  // Llamado por n8n webhook para el reset periódico
  async runReset() {
    return this.seedDemoTenant();
  }

  startResetScheduler() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('⏱️  [Demo] Seed inicial al arrancar (reset periódico gestionado por n8n)...');
    this.seedDemoTenant();
  }

  stopResetScheduler() {
    this.isRunning = false;
  }
}

module.exports = new DemoTenantService();
