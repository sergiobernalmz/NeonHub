
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const DEMO_STORE_ID = '75cf2d3d-f22e-4ac1-805f-5da02e9c70b0';
const SNAPSHOT_PATH = path.join(__dirname, '../../data/demo_seed_snapshot.json');

const seq = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, port: process.env.DB_PORT || 5433, dialect: 'postgres', logging: false }
);

// ─── UUIDs estables (fijos para que el script sea completamente determinista) ──

const CAT = {
  smartphones:  'fc2c7516-0aa3-4637-9c97-acbf76995dd7',
  portatiles:   'f26b356e-ad54-494a-af24-cee60aeb9bdc',
  audio:        '4aae74b4-f7c5-4594-b7db-9cd37bc1555a',
  wearables:    '067057b4-26fc-4baf-bb05-9ae9e22aca92',
  accesorios:   'a337459f-73d2-4aec-9db4-b7cc1869f959',
  gaming:       '2200d7c2-4cd1-42b6-8b2b-87b2436d91fb',
};

const PROD_IDS = [
  '05d7ec58-b696-4ed9-9a0c-9e04660f3ceb', // p1  iPhone 15 Pro
  '7b075de2-5d6a-4b7e-be75-3ddfb44dca28', // p2  Samsung Galaxy S24 Ultra
  '7de000db-ce21-4188-b468-bf8218f57efa', // p3  Google Pixel 8 Pro
  'a629f543-64b0-4777-8c52-b76989512b89', // p4  iPad Air M2
  'af1a2474-f6e2-47ce-9240-0e1716e0a089', // p5  Xiaomi 14 Ultra
  '1fa7229a-756e-45ca-a07a-7b31dab331d7', // p6  MacBook Air M3
  'b53ad433-a503-4097-86ac-e55ebc088414', // p7  Dell XPS 15
  '039a0dbb-a3b9-4890-9e8b-ca8c3232bd2f', // p8  ThinkPad X1 Carbon
  '200723a9-fd7d-4ebe-837c-a2fecf0df182', // p9  ASUS ZenBook 14 OLED
  'ceb3337c-73ca-45cf-87e0-532a54f479c1', // p10 HP Spectre x360
  '2f043d6f-76fd-46ff-ac35-28ffd6380971', // p11 AirPods Pro 2
  '9f9308c8-1a23-4502-86f9-02387f6e7f61', // p12 Sony WH-1000XM5
  '92838722-bc5e-498a-9471-5f6505e8da00', // p13 JBL Charge 5
  '745a9865-2d14-4726-b903-465226333400', // p14 Bose QuietComfort 45
  'c291ffc0-bb51-40e7-a85e-ee46c191a389', // p15 Sennheiser HD 560S
  '25309530-c2fd-4108-b971-0bcca98659a5', // p16 Apple Watch Series 9
  '6a22903d-0a03-409b-afb4-a288f125f35d', // p17 Samsung Galaxy Watch 6
  '72fa5ff9-2974-41db-837a-f152385f8e41', // p18 Garmin Fenix 7 Solar
  '630bc7e7-2327-48af-b0f3-592e9a64cf1b', // p19 Fitbit Charge 6
  '760dc708-d435-43fc-a8cb-f7647db2b050', // p20 Amazfit GTR 4
  '5758f03b-5469-4732-87f2-5feb64061fbd', // p21 Cargador MagSafe
  '8a99be61-2723-4bee-8f3d-67b74386db44', // p22 Logitech MX Master 3S
  '28bf6e0a-d5ef-4f21-be0f-77de72bba4cf', // p23 Samsung 65W Cargador
  '78a8ebb7-9501-415e-8b5f-75318bc7f3ff', // p24 Anker PowerBank 26800
  '12a43e94-6a6d-4352-8693-55ce4452edc7', // p25 Belkin Hub USB-C 7en1
  'cfbae716-d90d-4144-9958-fa301acd2372', // p26 PS5 DualSense
  'f57db08f-5a60-4c54-aedf-ce6f3077e7df', // p27 Xbox Elite S2
  '8947581e-2996-42b8-9320-33b7b35b8e06', // p28 Razer DeathAdder V3
  '9a4e02b4-12d0-422c-9cf2-d2378607113f', // p29 HyperX Cloud Alpha
  '8685b9ad-5487-4d59-9a12-199b2bd24a68', // p30 Nintendo Switch OLED
];

// los 8 clientes existentes se mantienen; añadimos CLI-009 y CLI-010
const CUST_IDS = {
  cli001: '4e0127ed-df1e-4e40-892a-67b3f5c30140',
  cli002: 'c08bd0f2-a24d-41bc-bb23-f1fdbf563fa1',
  cli003: '1ae13ac1-f041-48af-ad73-eeb962e5f6ba',
  cli004: '6ecee34d-3b54-437d-91f3-bb550f9083de',
  cli005: '59d65a94-003e-4545-a81f-d01e641940b5',
  cli006: 'f5854220-f03b-47a0-930f-eef8fe60a3f0',
  cli007: '3e73c1cf-d54d-4a41-a8d1-80f7397ad991',
  cli008: '23ee7a98-0a02-4849-a822-72509d615139',
  cli009: '1160b339-c345-46cd-8fd1-532ec2cd42f0',
  cli010: '4a79c7ca-c3a4-4a59-8a14-93f53144fa23',
};

const ORDER_IDS = [
  '997e8bd5-3959-4427-9381-465f6d4fe167',
  'c7fd5aa8-d716-49ba-a195-ff42fda100a8',
  '84338e66-9cd9-4e79-8238-bba2bcfbd885',
  'cf4aba55-c761-4c7e-bae4-470baac74684',
  'd60526b0-5f1a-4451-a383-67689f5e4cbc',
  '858b5b1f-514a-4f0b-af6a-198fe8fcc1cb',
  'baea46b5-3182-4420-ae9a-e2b07f404680',
  '2fe4b8f2-c358-48a5-94da-bb570ad518e4',
  'cf2a77f8-1815-4e06-91c6-e7d15ae1a3fd',
  '694d6bc6-cb06-475d-8086-c05cbe92d1c3',
  '9afeaba7-45f4-4171-b18c-62939d7e51b9',
  'b35de9bb-6a23-4db1-8786-aafd316c4ef9',
  'd3e6fa82-d7a9-4e92-a041-faf50af72e5f',
  '64379a3b-df2b-4790-9d3d-fde488b6c283',
  '18f17d54-671d-4b0a-9b56-d455fcd9cf44',
];

// ─── Data definitions ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: CAT.smartphones, name: 'Smartphones y Tablets', slug: 'smartphones-tablets', color: '#6366f1', icon: '📱', sort_order: 1 },
  { id: CAT.portatiles,  name: 'Portátiles y PCs',      slug: 'portatiles-pcs',      color: '#0ea5e9', icon: '💻', sort_order: 2 },
  { id: CAT.audio,       name: 'Audio y Sonido',         slug: 'audio-sonido',        color: '#f59e0b', icon: '🎧', sort_order: 3 },
  { id: CAT.wearables,   name: 'Wearables y Smartwatches', slug: 'wearables-smartwatches', color: '#10b981', icon: '⌚', sort_order: 4 },
  { id: CAT.accesorios,  name: 'Accesorios y Periféricos', slug: 'accesorios-perifericos', color: '#8b5cf6', icon: '🔌', sort_order: 5 },
  { id: CAT.gaming,      name: 'Gaming',                 slug: 'gaming',              color: '#ef4444', icon: '🎮', sort_order: 6 },
];

const PRODUCTS = [
  // ── Smartphones y Tablets ──
  { id: PROD_IDS[0],  name: 'iPhone 15 Pro 256GB',       slug: 'iphone-15-pro-256gb',      sku: 'APL-IP15P-256', cat: CAT.smartphones, price: 1199.00, compare: 1299.00, cost: 900.00, stock: 18, desc: 'El smartphone más avanzado de Apple con chip A17 Pro, cámara de 48MP y titanio de grado aeroespacial. Incluye Dynamic Island y carga USB-C.' },
  { id: PROD_IDS[1],  name: 'Samsung Galaxy S24 Ultra',  slug: 'samsung-galaxy-s24-ultra', sku: 'SAM-S24U-256', cat: CAT.smartphones, price: 1349.00, compare: 1499.00, cost: 980.00, stock: 12, desc: 'El buque insignia de Samsung con S Pen integrado, cámara con zoom óptico 10x y pantalla Dynamic AMOLED 2X de 6.8". Procesador Snapdragon 8 Gen 3.' },
  { id: PROD_IDS[2],  name: 'Google Pixel 8 Pro',        slug: 'google-pixel-8-pro',       sku: 'GOO-PIX8P-128', cat: CAT.smartphones, price: 999.00, compare: 1099.00, cost: 720.00, stock: 15, desc: 'El Pixel más inteligente con Google AI integrada, chip Tensor G3 y la mejor cámara computacional del mercado. Garantía de 7 años de actualizaciones.' },
  { id: PROD_IDS[3],  name: 'iPad Air M2 256GB WiFi',    slug: 'ipad-air-m2-256gb-wifi',   sku: 'APL-IPAM2-256', cat: CAT.smartphones, price: 899.00, compare: 949.00,  cost: 650.00, stock: 20, desc: 'Tablet premium con chip M2, pantalla Liquid Retina de 11", compatible con Apple Pencil 2 y Magic Keyboard. Perfecta para creativos y estudiantes.' },
  { id: PROD_IDS[4],  name: 'Xiaomi 14 Ultra 512GB',     slug: 'xiaomi-14-ultra-512gb',    sku: 'XIA-14U-512', cat: CAT.smartphones, price: 999.00, compare: 1149.00, cost: 720.00, stock: 10, desc: 'Cámara Leica de 1" con óptica variable, pantalla OLED LTPO de 6.73" y carga rápida de 90W. El smartphone fotográfico definitivo.' },

  // ── Portátiles y PCs ──
  { id: PROD_IDS[5],  name: 'MacBook Air 15" M3 8GB',    slug: 'macbook-air-15-m3-8gb',    sku: 'APL-MBA15M3-8', cat: CAT.portatiles, price: 1499.00, compare: 1599.00, cost: 1100.00, stock: 8,  desc: 'El portátil más fino y ligero de Apple con chip M3, batería de hasta 18h y pantalla Liquid Retina de 15.3". Sin ventilador, totalmente silencioso.' },
  { id: PROD_IDS[6],  name: 'Dell XPS 15 9530 i7 32GB',  slug: 'dell-xps-15-i7-32gb',      sku: 'DEL-XPS15-32', cat: CAT.portatiles, price: 1899.00, compare: 2099.00, cost: 1400.00, stock: 6,  desc: 'Portátil de alto rendimiento con Intel Core i7-13700H, 32GB RAM, SSD NVMe 1TB y pantalla OLED 3.5K de 15.6". Ideal para desarrollo y edición.' },
  { id: PROD_IDS[7],  name: 'ThinkPad X1 Carbon Gen 11', slug: 'thinkpad-x1-carbon-gen11', sku: 'LEN-X1CG11-16', cat: CAT.portatiles, price: 1799.00, compare: 1999.00, cost: 1320.00, stock: 7,  desc: 'Ultrabook empresarial con certificación MIL-SPEC, Intel Core i7, 16GB RAM y 1.12kg de peso. El favorito de los profesionales exigentes.' },
  { id: PROD_IDS[8],  name: 'ASUS ZenBook 14 OLED',      slug: 'asus-zenbook-14-oled',     sku: 'ASU-ZB14O-16', cat: CAT.portatiles, price: 999.00, compare: 1149.00, cost: 720.00, stock: 11, desc: 'Portátil compacto con pantalla OLED 2.8K de 90Hz, AMD Ryzen 7, 16GB RAM y diseño en aluminio anodizado. Peso: 1.39kg.' },
  { id: PROD_IDS[9],  name: 'HP Spectre x360 14 OLED',   slug: 'hp-spectre-x360-14-oled',  sku: 'HP-SPX360-16', cat: CAT.portatiles, price: 1399.00, compare: 1599.00, cost: 1020.00, stock: 9,  desc: '2-en-1 convertible premium con pantalla OLED táctil 2.8K, Intel Core Ultra 7, pluma HP Tilt Pen incluida y diseño en aluminio negro poseidón.' },

  // ── Audio y Sonido ──
  { id: PROD_IDS[10], name: 'AirPods Pro (2ª generación)', slug: 'airpods-pro-2',           sku: 'APL-APP2-USB', cat: CAT.audio, price: 279.00, compare: 299.00, cost: 180.00, stock: 30, desc: 'Los mejores auriculares in-ear de Apple con cancelación activa de ruido H2, audio espacial personalizado y batería de hasta 6h. Estuche USB-C.' },
  { id: PROD_IDS[11], name: 'Sony WH-1000XM5',             slug: 'sony-wh-1000xm5',        sku: 'SON-WH1XM5', cat: CAT.audio, price: 349.00, compare: 399.00, cost: 230.00, stock: 22, desc: 'Los auriculares over-ear con mejor cancelación de ruido del mercado. 30h de batería, 8 micrófonos y plegado compacto. La referencia absoluta.' },
  { id: PROD_IDS[12], name: 'JBL Charge 5 Azul',           slug: 'jbl-charge-5-azul',      sku: 'JBL-CH5-AZU', cat: CAT.audio, price: 169.00, compare: 199.00, cost: 110.00, stock: 35, desc: 'Altavoz portátil IP67 con 20h de autonomía, bass radiator para graves profundos y carga de dispositivos USB-A. Resistente al polvo y al agua.' },
  { id: PROD_IDS[13], name: 'Bose QuietComfort 45',         slug: 'bose-quietcomfort-45',  sku: 'BOS-QC45-NEG', cat: CAT.audio, price: 279.00, compare: 329.00, cost: 190.00, stock: 18, desc: 'Auriculares inalámbricos con cancelación de ruido renombrada de Bose, 24h de batería y modo Aware para escuchar el entorno. Confort excepcional.' },
  { id: PROD_IDS[14], name: 'Sennheiser HD 560S',           slug: 'sennheiser-hd-560s',     sku: 'SEN-HD560S', cat: CAT.audio, price: 199.00, compare: 249.00, cost: 130.00, stock: 16, desc: 'Auriculares abiertos de referencia para estudio y audiofilia casual. Respuesta de frecuencia 6-38kHz, driver de 38mm y cable intercambiable.' },

  // ── Wearables y Smartwatches ──
  { id: PROD_IDS[15], name: 'Apple Watch Series 9 GPS 45mm', slug: 'apple-watch-series9-45mm', sku: 'APL-AWS9-45', cat: CAT.wearables, price: 429.00, compare: 469.00, cost: 290.00, stock: 25, desc: 'El smartwatch más avanzado con chip S9, doble toque sin contacto, pantalla Retina siempre activa y detección de choque. GPS + Brújula integrados.' },
  { id: PROD_IDS[16], name: 'Samsung Galaxy Watch 6 Classic 47mm', slug: 'samsung-galaxy-watch6-47mm', sku: 'SAM-GW6C-47', cat: CAT.wearables, price: 399.00, compare: 449.00, cost: 270.00, stock: 20, desc: 'Smartwatch premium con bisel rotante físico, pantalla Super AMOLED 1.5", análisis avanzado del sueño y ECG. Carga inalámbrica rápida.' },
  { id: PROD_IDS[17], name: 'Garmin Fenix 7 Solar',          slug: 'garmin-fenix-7-solar',  sku: 'GAR-FX7S-NEG', cat: CAT.wearables, price: 699.00, compare: 799.00, cost: 480.00, stock: 12, desc: 'GPS multisport de alta gama con carga solar, hasta 28 días de batería, mapas TopoActive y sensores de salud avanzados para atletas de élite.' },
  { id: PROD_IDS[18], name: 'Fitbit Charge 6',               slug: 'fitbit-charge-6',       sku: 'FIT-CH6-NEG', cat: CAT.wearables, price: 159.00, compare: 179.00, cost: 100.00, stock: 40, desc: 'Pulsera de actividad con GPS integrado, sensor ECG, SpO2, 40+ modos de ejercicio y 7 días de batería. Compatible con Google Maps y Wallet.' },
  { id: PROD_IDS[19], name: 'Amazfit GTR 4',                 slug: 'amazfit-gtr-4',         sku: 'AMA-GTR4-NEG', cat: CAT.wearables, price: 169.00, compare: 199.00, cost: 100.00, stock: 28, desc: 'Smartwatch elegante con 150 modos deportivos, GPS de doble banda, pantalla AMOLED 1.43" y 14 días de batería. Excelente relación calidad-precio.' },

  // ── Accesorios y Periféricos ──
  { id: PROD_IDS[20], name: 'Cargador MagSafe 15W USB-C',   slug: 'cargador-magsafe-15w',   sku: 'APL-MSAFE-15W', cat: CAT.accesorios, price: 39.00, compare: 45.00, cost: 20.00, stock: 50, desc: 'Cargador magnético oficial de Apple para iPhone 12 y superior. Carga rápida de 15W con alineación perfecta. Cable USB-C incluido de 1m.' },
  { id: PROD_IDS[21], name: 'Logitech MX Master 3S',         slug: 'logitech-mx-master-3s', sku: 'LOG-MXM3S-GRI', cat: CAT.accesorios, price: 99.00, compare: 119.00, cost: 60.00, stock: 32, desc: 'El ratón más avanzado para productividad con scroll electromagnético MagSpeed, sensor 8000 DPI y silencioso al 90%. Conecta hasta 3 dispositivos.' },
  { id: PROD_IDS[22], name: 'Samsung 65W Cargador Duo',      slug: 'samsung-65w-cargador-duo', sku: 'SAM-CH65W-BLA', cat: CAT.accesorios, price: 49.00, compare: 59.00, cost: 28.00, stock: 45, desc: 'Cargador de pared con dos puertos USB-C de 65W y 45W. Carga rápida Super Fast 2.0 compatible con Galaxy S24, tablets y portátiles USB-C.' },
  { id: PROD_IDS[23], name: 'Anker PowerBank 26800mAh',      slug: 'anker-powerbank-26800',  sku: 'ANK-PB268-BLA', cat: CAT.accesorios, price: 69.00, compare: 89.00, cost: 40.00, stock: 38, desc: 'Batería portátil de alta capacidad con doble entrada y triple salida (2x USB-A + 1x USB-C). Carga hasta 3 dispositivos simultáneamente.' },
  { id: PROD_IDS[24], name: 'Belkin Hub USB-C 7en1',         slug: 'belkin-hub-usbc-7en1',  sku: 'BEL-HUB7N1-GRI', cat: CAT.accesorios, price: 59.00, compare: 79.00, cost: 35.00, stock: 27, desc: 'Hub multiport con HDMI 4K, USB-A x3, USB-C pass-through 100W, lector SD y microSD. Diseño compacto plegable. Compatible Mac y PC.' },

  // ── Gaming ──
  { id: PROD_IDS[25], name: 'PS5 DualSense Controller',      slug: 'ps5-dualsense-blanco',  sku: 'SON-DS5-BLA', cat: CAT.gaming, price: 69.00, compare: 79.00, cost: 42.00, stock: 45, desc: 'Mando inalámbrico con gatillos adaptativos, vibración háptica y micrófono integrado. Compatible con PS5 y PC vía USB o Bluetooth.' },
  { id: PROD_IDS[26], name: 'Xbox Elite Controller S2',      slug: 'xbox-elite-s2-negro',   sku: 'MIC-XECIS2', cat: CAT.gaming, price: 149.00, compare: 169.00, cost: 95.00, stock: 15, desc: 'El mando premium para Xbox y PC con gatillos de tensión ajustable, palancas intercambiables, grips texturizados y batería recargable de 40h.' },
  { id: PROD_IDS[27], name: 'Razer DeathAdder V3',           slug: 'razer-deathadder-v3',   sku: 'RAZ-DAV3-NEG', cat: CAT.gaming, price: 89.00, compare: 109.00, cost: 52.00, stock: 22, desc: 'Ratón gaming ergonómico con sensor Focus Pro 30K, 90 horas de batería inalámbrica, 5 botones programables y peso de solo 63g.' },
  { id: PROD_IDS[28], name: 'HyperX Cloud Alpha Wireless',   slug: 'hyperx-cloud-alpha-wireless', sku: 'HPX-CAW-ROJ', cat: CAT.gaming, price: 129.00, compare: 149.00, cost: 80.00, stock: 19, desc: 'Auriculares gaming con 300h de batería inalámbrica, drivers de doble cámara para mejor claridad de audio y cómoda estructura de aluminio.' },
  { id: PROD_IDS[29], name: 'Nintendo Switch OLED Blanco',   slug: 'nintendo-switch-oled-blanco', sku: 'NIN-SWOLED-BLA', cat: CAT.gaming, price: 339.00, compare: 369.00, cost: 240.00, stock: 20, desc: 'Consola híbrida con pantalla OLED de 7", base con LAN integrada, 64GB de almacenamiento interno y los mejores exclusivos de Nintendo.' },
];

const ALL_CUSTOMERS = [
  {
    id: CUST_IDS.cli001, customer_code: 'CLI-001',
    first_name: 'Carlos', last_name: 'Martínez', email: 'carlos.martinez@demo.es',
    phone: '+34 600 111 001', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Calle Mayor 12', city: 'Madrid', zip: '28013' }),
  },
  {
    id: CUST_IDS.cli002, customer_code: 'CLI-002',
    first_name: 'Ana', last_name: 'García', email: 'ana.garcia@demo.es',
    phone: '+34 600 111 002', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Paseo de Gracia 88', city: 'Barcelona', zip: '08008' }),
  },
  {
    id: CUST_IDS.cli003, customer_code: 'CLI-003',
    first_name: 'Pedro', last_name: 'López', email: 'pedro.lopez@demo.es',
    phone: '+34 600 111 003', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Calle Sierpes 34', city: 'Sevilla', zip: '41004' }),
  },
  {
    id: CUST_IDS.cli004, customer_code: 'CLI-004',
    first_name: 'Laura', last_name: 'Sánchez', email: 'laura.sanchez@demo.es',
    phone: '+34 600 111 004', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Gran Vía 22', city: 'Bilbao', zip: '48001' }),
  },
  {
    id: CUST_IDS.cli005, customer_code: 'CLI-005',
    first_name: 'Innovatech', last_name: 'SL', email: 'compras@innovatech.es',
    phone: '+34 900 200 005', customer_type: 'business',
    billing_address: JSON.stringify({ street: 'Polígono Industrial Norte 7', city: 'Valencia', zip: '46015' }),
  },
  {
    id: CUST_IDS.cli006, customer_code: 'CLI-006',
    first_name: 'Marta', last_name: 'Fernández', email: 'marta.fernandez@demo.es',
    phone: '+34 600 111 006', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Rúa do Vilar 9', city: 'Santiago de Compostela', zip: '15705' }),
  },
  {
    id: CUST_IDS.cli007, customer_code: 'CLI-007',
    first_name: 'Diego', last_name: 'Ruiz', email: 'diego.ruiz@demo.es',
    phone: '+34 600 111 007', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Calle Larios 3', city: 'Málaga', zip: '29005' }),
  },
  {
    id: CUST_IDS.cli008, customer_code: 'CLI-008',
    first_name: 'Gadgets', last_name: 'Corp SA', email: 'pedidos@gadgetscorp.es',
    phone: '+34 900 300 008', customer_type: 'business',
    billing_address: JSON.stringify({ street: 'Av. de la Industria 45', city: 'Alcobendas', zip: '28108' }),
  },
  {
    id: CUST_IDS.cli009, customer_code: 'CLI-009',
    first_name: 'Isabel', last_name: 'Navarro', email: 'isabel.n@demo.es',
    phone: '+34 612 345 890', customer_type: 'individual',
    billing_address: JSON.stringify({ street: 'Calle Gran Vía 45', city: 'Madrid', zip: '28013' }),
  },
  {
    id: CUST_IDS.cli010, customer_code: 'CLI-010',
    first_name: 'TechPro', last_name: 'SL', email: 'compras@techpro.es',
    phone: '+34 912 000 101', customer_type: 'business',
    billing_address: JSON.stringify({ street: 'Av. Diagonal 211', city: 'Barcelona', zip: '08018' }),
  },
];

// 15 pedidos: 8 completados, 4 en proceso, 3 pendientes
// cada pedido referencia clientes y productos existentes
const ALL_CUST = Object.values(CUST_IDS);
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const ORDERS_DATA = [
  // pedidos completados (pagados)
  { id: ORDER_IDS[0],  num: 'ORD-DEMO-001', cust: ALL_CUST[0], items: [{pid: PROD_IDS[0],  qty:1, price:1199.00}, {pid: PROD_IDS[10], qty:1, price:279.00}], status:'completed', pay:'paid',    date: daysAgo(28) },
  { id: ORDER_IDS[1],  num: 'ORD-DEMO-002', cust: ALL_CUST[1], items: [{pid: PROD_IDS[5],  qty:1, price:1499.00}],                                               status:'completed', pay:'paid',    date: daysAgo(25) },
  { id: ORDER_IDS[2],  num: 'ORD-DEMO-003', cust: ALL_CUST[2], items: [{pid: PROD_IDS[11], qty:1, price:349.00},  {pid: PROD_IDS[15], qty:1, price:429.00}],    status:'completed', pay:'paid',    date: daysAgo(22) },
  { id: ORDER_IDS[3],  num: 'ORD-DEMO-004', cust: ALL_CUST[3], items: [{pid: PROD_IDS[25], qty:2, price:69.00},   {pid: PROD_IDS[28], qty:1, price:129.00}],    status:'completed', pay:'paid',    date: daysAgo(20) },
  { id: ORDER_IDS[4],  num: 'ORD-DEMO-005', cust: ALL_CUST[4], items: [{pid: PROD_IDS[2],  qty:1, price:999.00},  {pid: PROD_IDS[20], qty:1, price:39.00}],     status:'completed', pay:'paid',    date: daysAgo(18) },
  { id: ORDER_IDS[5],  num: 'ORD-DEMO-006', cust: ALL_CUST[5], items: [{pid: PROD_IDS[8],  qty:1, price:999.00}],                                               status:'completed', pay:'paid',    date: daysAgo(15) },
  { id: ORDER_IDS[6],  num: 'ORD-DEMO-007', cust: ALL_CUST[6], items: [{pid: PROD_IDS[16], qty:1, price:399.00}, {pid: PROD_IDS[22], qty:1, price:49.00}],      status:'completed', pay:'paid',    date: daysAgo(12) },
  { id: ORDER_IDS[7],  num: 'ORD-DEMO-008', cust: ALL_CUST[7], items: [{pid: PROD_IDS[29], qty:1, price:339.00}, {pid: PROD_IDS[26], qty:1, price:149.00}],     status:'completed', pay:'paid',    date: daysAgo(10) },
  // pedidos en proceso
  { id: ORDER_IDS[8],  num: 'ORD-DEMO-009', cust: ALL_CUST[8], items: [{pid: PROD_IDS[1],  qty:1, price:1349.00}],                                              status:'processing', pay:'paid',   date: daysAgo(7)  },
  { id: ORDER_IDS[9],  num: 'ORD-DEMO-010', cust: ALL_CUST[9], items: [{pid: PROD_IDS[6],  qty:1, price:1899.00}, {pid: PROD_IDS[21], qty:1, price:99.00}],     status:'processing', pay:'paid',   date: daysAgo(5)  },
  { id: ORDER_IDS[10], num: 'ORD-DEMO-011', cust: ALL_CUST[0], items: [{pid: PROD_IDS[17], qty:1, price:699.00}],                                               status:'processing', pay:'paid',   date: daysAgo(4)  },
  { id: ORDER_IDS[11], num: 'ORD-DEMO-012', cust: ALL_CUST[2], items: [{pid: PROD_IDS[3],  qty:1, price:899.00}, {pid: PROD_IDS[24], qty:1, price:59.00}],      status:'processing', pay:'paid',   date: daysAgo(3)  },
  // pedidos pendientes
  { id: ORDER_IDS[12], num: 'ORD-DEMO-013', cust: ALL_CUST[4], items: [{pid: PROD_IDS[13], qty:1, price:279.00}, {pid: PROD_IDS[19], qty:1, price:169.00}],     status:'pending', pay:'pending_payment', date: daysAgo(2) },
  { id: ORDER_IDS[13], num: 'ORD-DEMO-014', cust: ALL_CUST[6], items: [{pid: PROD_IDS[27], qty:1, price:89.00},  {pid: PROD_IDS[23], qty:1, price:69.00}],      status:'pending', pay:'pending_payment', date: daysAgo(1) },
  { id: ORDER_IDS[14], num: 'ORD-DEMO-015', cust: ALL_CUST[1], items: [{pid: PROD_IDS[9],  qty:1, price:1399.00}],                                              status:'pending', pay:'pending_payment', date: daysAgo(0) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTotal(items) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = parseFloat((subtotal * 0.21).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), tax_amount: tax, total_amount: total };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Demo Store Seed — Electronics / Gadgets');
  console.log(`   Store: ${DEMO_STORE_ID}\n`);

  const t = await seq.transaction();
  try {
    const run = (q, r) => seq.query(q, { replacements: r, transaction: t });

    // 1. Remove old demoTenantService categories & products (not seed-marked)
    console.log('🧹 Cleaning old placeholder data...');
    const [oldCats] = await run(
      `SELECT id FROM categories WHERE store_id = :sid AND id NOT IN (:keepIds)`,
      { sid: DEMO_STORE_ID, keepIds: Object.values(CAT) }
    );
    if (oldCats.length > 0) {
      const oldCatIds = oldCats.map(r => r.id);
      await run(`DELETE FROM products WHERE store_id = :sid AND category_id IN (:catIds)`, { sid: DEMO_STORE_ID, catIds: oldCatIds });
      await run(`DELETE FROM categories WHERE id IN (:ids)`, { ids: oldCatIds });
    }
    await run(`DELETE FROM products WHERE store_id = :sid AND id NOT IN (:keepIds)`, { sid: DEMO_STORE_ID, keepIds: PROD_IDS });

    // 2. Upsert categories
    console.log('📁 Inserting 6 categories...');
    for (const c of CATEGORIES) {
      await run(`
        INSERT INTO categories (id, store_id, name, slug, color, icon, sort_order, is_active, metadata, created_at, updated_at)
        VALUES (:id, :sid, :name, :slug, :color, :icon, :sort_order, true, :meta, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, slug = EXCLUDED.slug, color = EXCLUDED.color,
          icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
          is_active = true, deleted_at = NULL, updated_at = NOW()
      `, { id: c.id, sid: DEMO_STORE_ID, name: c.name, slug: c.slug, color: c.color, icon: c.icon, sort_order: c.sort_order, meta: JSON.stringify({ is_seed: true }) });
    }

    // 3. Upsert products
    console.log('📦 Inserting 30 products...');
    for (const p of PRODUCTS) {
      await run(`
        INSERT INTO products (
          id, store_id, name, slug, sku, description, category_id, price, cost_price,
          compare_price, stock_quantity, is_active, is_featured, currency, metadata, created_at, updated_at
        ) VALUES (
          :id, :sid, :name, :slug, :sku, :desc, :cat, :price, :cost,
          :compare, :stock, true, false, 'EUR', :meta, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, slug = EXCLUDED.slug, sku = EXCLUDED.sku,
          description = EXCLUDED.description, category_id = EXCLUDED.category_id,
          price = EXCLUDED.price, cost_price = EXCLUDED.cost_price,
          compare_price = EXCLUDED.compare_price, stock_quantity = EXCLUDED.stock_quantity,
          is_active = true, deleted_at = NULL, updated_at = NOW()
      `, {
        id: p.id, sid: DEMO_STORE_ID, name: p.name, slug: p.slug, sku: p.sku,
        desc: p.desc, cat: p.cat, price: p.price, cost: p.cost,
        compare: p.compare, stock: p.stock,
        meta: JSON.stringify({ is_seed: true })
      });
    }

    // 4. Upsert all 10 seed customers
    console.log('👥 Upserting 10 seed customers...');
    for (const c of ALL_CUSTOMERS) {
      await run(`
        INSERT INTO customers (
          id, store_id, customer_code, first_name, last_name, email, phone,
          customer_type, billing_address, is_active, tags, created_at, updated_at
        ) VALUES (
          :id, :sid, :code, :fn, :ln, :email, :phone,
          :type, :billing, true, :tags, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          tags = EXCLUDED.tags, updated_at = NOW()
      `, {
        id: c.id, sid: DEMO_STORE_ID, code: c.customer_code,
        fn: c.first_name, ln: c.last_name, email: c.email, phone: c.phone,
        type: c.customer_type, billing: c.billing_address,
        tags: JSON.stringify({ is_seed: true })
      });
    }

    // 5. eliminamos los pedidos existentes de la tienda demo y los recreamos con los datos correctos
    console.log('🛒 Rebuilding 15 seed orders...');
    const [existingOrders] = await run(`SELECT id FROM orders WHERE store_id = :sid`, { sid: DEMO_STORE_ID });
    if (existingOrders.length > 0) {
      const existingIds = existingOrders.map(r => r.id);
      await run(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id IN (:ids))`, { ids: existingIds });
      await run(`DELETE FROM invoices WHERE order_id IN (:ids)`, { ids: existingIds });
      await run(`DELETE FROM transactions WHERE order_id IN (:ids)`, { ids: existingIds });
      await run(`DELETE FROM order_items WHERE order_id IN (:ids)`, { ids: existingIds });
      await run(`DELETE FROM orders WHERE store_id = :sid`, { sid: DEMO_STORE_ID });
    }

    // insertamos los pedidos semilla con sus items
    const snapshotOrderItems = [];
    for (const o of ORDERS_DATA) {
      const { subtotal, tax_amount, total_amount } = calcTotal(o.items);
      await run(`
        INSERT INTO orders (
          id, store_id, order_number, customer_id, status, payment_status,
          order_date, subtotal, tax_amount, discount_amount, shipping_amount,
          total_amount, currency, metadata, created_at, updated_at
        ) VALUES (
          :id, :sid, :num, :cust, :status, :pay,
          :date, :subtotal, :tax, 0, 0,
          :total, 'EUR', :meta, :date, :date
        )
      `, {
        id: o.id, sid: DEMO_STORE_ID, num: o.num, cust: o.cust,
        status: o.status, pay: o.pay, date: o.date,
        subtotal, tax: tax_amount, total: total_amount,
        meta: JSON.stringify({ is_seed: true })
      });

      for (let i = 0; i < o.items.length; i++) {
        const item = o.items[i];
        const lineTotal = parseFloat((item.price * item.qty).toFixed(2));
        const oi_id_key = `oi${ORDERS_DATA.indexOf(o) * 2 + i + 1}`;
        // usamos IDs secuenciales de nuestro pool
        const oi_id = require('uuid').v4(); // id nuevo en cada seed — el snapshot lo gestiona
        await run(`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_rate, tax_rate, line_total, created_at, updated_at)
          VALUES (:id, :oid, :pid, :qty, :price, 0.0000, 0.2100, :total, NOW(), NOW())
        `, { id: oi_id, oid: o.id, pid: item.pid, qty: item.qty, price: item.price, total: lineTotal });
        snapshotOrderItems.push({ id: oi_id, order_id: o.id, product_id: item.pid, quantity: item.qty, unit_price: item.price, discount_rate: 0, tax_rate: 0.21, line_total: lineTotal });
      }
    }

    await t.commit();
    console.log('\n✅ Seed complete:');
    console.log('   Categories : 6');
    console.log('   Products   : 30');
    console.log('   Customers  : 10');
    console.log('   Orders     : 15 (8 completed, 4 processing, 3 pending)');

    // 6. Write snapshot JSON for demoReset.js
    const snapshot = {
      categories: CATEGORIES.map(c => ({ id: c.id, name: c.name, slug: c.slug, color: c.color, icon: c.icon, sort_order: c.sort_order })),
      products: PRODUCTS.map(p => ({
        id: p.id, name: p.name, slug: p.slug, sku: p.sku, description: p.desc,
        category_id: p.cat, price: p.price, cost_price: p.cost, compare_price: p.compare,
        stock_quantity: p.stock, is_active: true, is_featured: false, currency: 'EUR',
        eco_friendly: false, sustainability_score: null, carbon_footprint: null, recyclable: false
      })),
      customers: [
        ...['CLI-001','CLI-002','CLI-003','CLI-004','CLI-005','CLI-006','CLI-007','CLI-008'].map(
          (code, i) => ({ id: Object.values(CUST_IDS)[i], customer_code: code })
        ),
        { id: CUST_IDS.cli009, customer_code: 'CLI-009' },
        { id: CUST_IDS.cli010, customer_code: 'CLI-010' },
      ],
      orders: ORDERS_DATA.map(o => {
        const { subtotal, tax_amount, total_amount } = calcTotal(o.items);
        return { id: o.id, order_number: o.num, status: o.status, payment_status: o.pay, subtotal, tax_amount, discount_amount: 0, shipping_amount: 0, total_amount };
      }),
      order_items: snapshotOrderItems,
    };

    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    console.log(`\n📄 Snapshot written → ${SNAPSHOT_PATH}`);
  } catch (err) {
    await t.rollback().catch(() => {});
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await seq.close();
  }
}

seed();
