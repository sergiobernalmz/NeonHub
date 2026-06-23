
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Sequelize } = require('sequelize');
const snapshot = require('../data/demo_seed_snapshot.json');

const DEMO_STORE_ID = '75cf2d3d-f22e-4ac1-805f-5da02e9c70b0';
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

const seq = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'postgres', logging: false }
);

const seedCatIds    = snapshot.categories.map(r => r.id);
const seedProdIds   = snapshot.products.map(r => r.id);
const seedCustIds   = snapshot.customers.map(r => r.id);
const seedOrderIds  = snapshot.orders.map(r => r.id);

async function resetDemo() {
  const start = Date.now();
  console.log(`[DemoReset] ${new Date().toISOString()} — Starting reset...`);

  try {
    // 1. borramos los order_items que no son del seed
    await seq.query(`
      DELETE FROM order_items
      WHERE order_id IN (
        SELECT id FROM orders
        WHERE store_id = '${DEMO_STORE_ID}'
          AND id NOT IN (${seedOrderIds.map(id => `'${id}'`).join(',')})
      )
    `);

    // 2. borramos los pedidos que no son del seed
    await seq.query(`
      DELETE FROM orders
      WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${seedOrderIds.map(id => `'${id}'`).join(',')})
    `);

    // 3. borramos los clientes que no son del seed
    await seq.query(`
      DELETE FROM customers
      WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${seedCustIds.map(id => `'${id}'`).join(',')})
    `);

    // 4. borramos los productos que no son del seed (borrado físico y lógico)
    await seq.query(`
      DELETE FROM products
      WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${seedProdIds.map(id => `'${id}'`).join(',')})
    `);

    // 5. borramos las categorías que no son del seed
    await seq.query(`
      DELETE FROM categories
      WHERE store_id = '${DEMO_STORE_ID}'
        AND id NOT IN (${seedCatIds.map(id => `'${id}'`).join(',')})
    `);

    // 6. restauramos los productos del seed a sus valores originales
    for (const p of snapshot.products) {
      await seq.query(`
        UPDATE products SET
          name = $1, slug = $2, price = $3, cost_price = $4,
          compare_price = $5, stock_quantity = $6, min_stock_level = $7,
          description = $8, is_active = $9, is_featured = $10,
          eco_friendly = $11, sustainability_score = $12,
          carbon_footprint = $13, recyclable = $14,
          deleted_at = NULL, updated_at = NOW()
        WHERE id = $15 AND store_id = '${DEMO_STORE_ID}'
      `, {
        bind: [
          p.name, p.slug, p.price, p.cost_price,
          p.compare_price, p.stock_quantity, p.min_stock_level,
          p.description, p.is_active, p.is_featured,
          p.eco_friendly, p.sustainability_score,
          p.carbon_footprint, p.recyclable,
          p.id
        ]
      });
    }

    // 7. restauramos las categorías del seed
    for (const c of snapshot.categories) {
      await seq.query(`
        UPDATE categories SET
          name = $1, slug = $2, color = $3, icon = $4,
          sort_order = $5, is_active = true, deleted_at = NULL, updated_at = NOW()
        WHERE id = $6 AND store_id = '${DEMO_STORE_ID}'
      `, { bind: [c.name, c.slug, c.color, c.icon, c.sort_order, c.id] });
    }

    // 8. restauramos los pedidos del seed y sus líneas
    // distribuimos created_at en los últimos 45 días (cubre el mes actual y el anterior)
    // para que la comparativa mes a mes del dashboard siempre tenga datos significativos
    const orderCount = snapshot.orders.length;
    for (let idx = 0; idx < orderCount; idx++) {
      const o = snapshot.orders[idx];
      // distribuimos de forma uniforme: los más recientes en el mes actual, los antiguos en el anterior
      const daysAgo = Math.floor((idx / orderCount) * 45);
      await seq.query(`
        UPDATE orders SET
          status = $1, payment_status = $2, subtotal = $3,
          tax_amount = $4, discount_amount = $5, shipping_amount = $6,
          total_amount = $7, deleted_at = NULL, updated_at = NOW(),
          created_at = NOW() - INTERVAL '${daysAgo} days'
        WHERE id = $8 AND store_id = '${DEMO_STORE_ID}'
      `, {
        bind: [
          o.status, o.payment_status, o.subtotal,
          o.tax_amount, o.discount_amount, o.shipping_amount,
          o.total_amount, o.id
        ]
      });
    }

    // 9. restauramos los order_items (borramos los del seed y los volvemos a insertar desde el snapshot)
    const seedOrderIdList = seedOrderIds.map(id => `'${id}'`).join(',');
    await seq.query(`DELETE FROM order_items WHERE order_id IN (${seedOrderIdList})`);
    for (const item of snapshot.order_items) {
      await seq.query(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_rate, tax_rate, line_total, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price,
          line_total = EXCLUDED.line_total, updated_at = NOW()
      `, {
        bind: [item.id, item.order_id, item.product_id, item.quantity, item.unit_price, item.discount_rate, item.tax_rate, item.line_total]
      });
    }

    // 10. borramos las devoluciones
    await seq.query(`DELETE FROM returns WHERE store_id = '${DEMO_STORE_ID}'`);

    // 11. borramos los tickets de soporte
    await seq.query(`DELETE FROM support_tickets WHERE store_id = '${DEMO_STORE_ID}'`);

    // 12. borramos invoice_items y facturas por customer_id (la tabla invoices no tiene store_id)
    await seq.query(`
      DELETE FROM invoice_items WHERE invoice_id IN (
        SELECT id FROM invoices WHERE customer_id IN (
          SELECT id FROM customers WHERE store_id = '${DEMO_STORE_ID}'
        )
      )
    `);
    await seq.query(`
      DELETE FROM invoices WHERE customer_id IN (
        SELECT id FROM customers WHERE store_id = '${DEMO_STORE_ID}'
      )
    `);

    // 13. borramos las sesiones del usuario demo
    await seq.query(`
      DELETE FROM user_sessions WHERE user_id IN (
        SELECT id FROM users WHERE email = 'demo@neonhub.es'
      )
    `);

    // 14. borramos códigos de descuento, items del carrito y logs de auditoría
    await seq.query(`DELETE FROM discount_codes WHERE store_id = '${DEMO_STORE_ID}'`);
    await seq.query(`
      DELETE FROM cart_items WHERE cart_id IN (
        SELECT id FROM carts WHERE user_id IN (
          SELECT id FROM users WHERE email = 'demo@neonhub.es'
        )
      )
    `);
    await seq.query(`DELETE FROM audit_logs WHERE store_id = '${DEMO_STORE_ID}'`);

    // 15. limpiamos las certificaciones de productos que no son del seed
    const seedProdIdList = seedProdIds.map(id => `'${id}'`).join(',');
    await seq.query(`
      DELETE FROM product_certifications WHERE product_id IN (
        SELECT id FROM products
        WHERE store_id = '${DEMO_STORE_ID}'
          AND id NOT IN (${seedProdIdList})
      )
    `);

    // 16. restauramos la configuración de la tienda (branding, tema, features, diseño)
    const demoSettings = JSON.stringify({
      currency: 'EUR',
      language: 'es',
      theme: { darkMode: true, primaryColor: '#0ea5e9' },
      branding: {
        appName: 'Demo Sostenible',
        store_description: 'Tienda de demostración de NeonHub',
        primary_color: '#0ea5e9',
        secondary_color: '#0284c7',
        accent_color: '#7dd3fc',
        bg_color: '#020617',
        hero_title: null,
        hero_subtitle: null,
      },
      enterprise_config: {
        features: {
          products: true, orders: true, customers: true, gallery: true,
          analytics: true, sustainability: true, reports: true,
          invoices: true, tickets: true, certifications: true,
          discounts: true,
          free_shipping_threshold: 50,
          free_shipping_disabled: false,
          shipping_cost: 4.99,
        },
        design: {
          layout: 'modern',
          button_style: 'pill',
          font_family: 'default',
          gradient_enabled: true,
          gradient_start: '#020617',
          gradient_end: '#0a1a3a',
          gradient_direction: 'to bottom right',
        },
        sections: {},
        limits: {},
      },
    });
    await seq.query(
      `UPDATE stores SET settings = $1::json, updated_at = NOW() WHERE id = '${DEMO_STORE_ID}'`,
      { bind: [demoSettings] }
    );

    const elapsed = Date.now() - start;
    console.log(`[DemoReset] ✅ Reset complete in ${elapsed}ms`);
  } catch (err) {
    console.error('[DemoReset] ❌ Error during reset:', err.message);
  }
}

// ejecutamos al arrancar y luego cada 30 minutos
resetDemo();
setInterval(resetDemo, INTERVAL_MS);

console.log(`[DemoReset] 🔄 Scheduled every 30 minutes. Store: ${DEMO_STORE_ID}`);
