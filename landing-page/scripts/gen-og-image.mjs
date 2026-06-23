import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/og-image.png');

const W = 1200;
const H = 630;

// --- helpers ----------------------------------------------------------------

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Build a radial gradient SVG stop list for a violet/indigo glow
function glow(cx, cy, r, color, opacity) {
  return `
    <radialGradient id="g${cx}${cy}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="${color}" stop-opacity="${opacity}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.7}" fill="url(#g${cx}${cy})"/>`;
}

// --- SVG source -------------------------------------------------------------

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- base gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0b0f1a"/>
      <stop offset="100%" stop-color="#0f0c1e"/>
    </linearGradient>

    <!-- border gradient -->
    <linearGradient id="border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#7c3aed" stop-opacity="0.6"/>
      <stop offset="50%"  stop-color="#4f46e5" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.1"/>
    </linearGradient>

    <!-- text gradient for logo -->
    <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- glow blobs -->
  ${glow(200,  180, 340, '#7c3aed', 0.35)}
  ${glow(1050, 480, 300, '#4338ca', 0.30)}
  ${glow(620,  630, 260, '#6d28d9', 0.18)}

  <!-- subtle grid lines -->
  <g stroke="#ffffff" stroke-opacity="0.03" stroke-width="1">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${H}"/>`).join('')}
    ${Array.from({ length: 7 },  (_, i) => `<line x1="0" y1="${i * 105}" x2="${W}" y2="${i * 105}"/>`).join('')}
  </g>

  <!-- card border -->
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}"
        rx="24" ry="24"
        fill="none"
        stroke="url(#border)"
        stroke-width="1.5"/>

  <!-- ── LOGO ────────────────────────────────────────────────── -->
  <!-- hex icon -->
  <g transform="translate(120, 220)">
    <!-- outer hex -->
    <polygon points="40,0 80,23 80,69 40,92 0,69 0,23"
             fill="#7c3aed" fill-opacity="0.25"
             stroke="#a78bfa" stroke-width="1.5"/>
    <!-- inner hex -->
    <polygon points="40,14 66,28 66,64 40,78 14,64 14,28"
             fill="#7c3aed" fill-opacity="0.15"/>
    <!-- "N" glyph -->
    <text x="40" y="60"
          font-family="'Arial Black', Arial, sans-serif"
          font-weight="900"
          font-size="42"
          fill="url(#logoGrad)"
          text-anchor="middle"
          dominant-baseline="auto">N</text>
  </g>

  <!-- wordmark -->
  <text x="230" y="283"
        font-family="'Arial Black', Arial, sans-serif"
        font-weight="900"
        font-size="72"
        fill="url(#logoGrad)"
        dominant-baseline="auto">NeonHub</text>

  <!-- ── TAGLINE ─────────────────────────────────────────────── -->
  <text x="120" y="370"
        font-family="Arial, sans-serif"
        font-weight="400"
        font-size="32"
        fill="#cbd5e1"
        dominant-baseline="auto">Crea tu tienda online profesional</text>

  <!-- ── DIVIDER ─────────────────────────────────────────────── -->
  <rect x="120" y="408" width="120" height="3" rx="2"
        fill="#7c3aed" fill-opacity="0.8"/>

  <!-- ── PILLS / FEATURES ────────────────────────────────────── -->
  ${[
    ['⚡ Rápido', 120],
    ['💳 Pagos Stripe', 270],
    ['📦 Multi-tenant', 460],
    ['📈 Analytics', 660],
  ].map(([label, x]) => `
    <rect x="${x}" y="440" width="${label.length * 13 + 24}" height="38"
          rx="19" fill="#7c3aed" fill-opacity="0.18"
          stroke="#a78bfa" stroke-opacity="0.3" stroke-width="1"/>
    <text x="${x + label.length * 6.5 + 12}" y="465"
          font-family="Arial, sans-serif"
          font-size="17"
          fill="#c4b5fd"
          text-anchor="middle"
          dominant-baseline="auto">${label}</text>
  `).join('')}

  <!-- ── BOTTOM URL ───────────────────────────────────────────── -->
  <text x="${W - 120}" y="${H - 60}"
        font-family="Arial, sans-serif"
        font-size="20"
        fill="#475569"
        text-anchor="end"
        dominant-baseline="auto">neonhub.es</text>
</svg>
`;

await sharp(Buffer.from(svg))
  .resize(W, H)
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`✓ og-image.png written to ${OUT}`);
