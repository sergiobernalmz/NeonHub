import React, { memo } from 'react';

const CSSVariables = ({ config }) => {
  const btnRadius = {
    pill: '9999px',
    square: '0px',
    soft: '6px',
    rounded: '12px'
  }[config.design?.button_style] || '12px';
  const cardRadius = '16px'; // Valor fijo para tarjetas y filtros

  const fontFamily = {
    serif: '"Merriweather", Georgia, serif',
    mono: '"JetBrains Mono", monospace',
    rounded: '"Nunito", sans-serif',
    default: '"Inter", system-ui, sans-serif'
  }[config.design?.font_family] || '"Inter", system-ui, sans-serif';

  const bgStyle = config.design?.gradient_enabled
    ? `linear-gradient(${config.design.gradient_direction || 'to right'}, ${config.design.gradient_start || config.colors.primary}, ${config.design.gradient_end || config.colors.secondary})`
    : config.colors.background || '#ffffff';

  const css = `
    :root {
      --c-primary: ${config.colors.primary || '#2563eb'};
      --c-secondary: ${config.colors.secondary || '#4f46e5'};
      --c-accent: ${config.colors.accent || '#06b6d4'};
      --c-bg: ${config.colors.background || '#ffffff'};
      --btn-radius: ${btnRadius};
      --card-radius: ${cardRadius};
      --font-family: ${fontFamily};
    }

    .shop-root, .tenant-theme {
      font-family: var(--font-family);
      background: ${bgStyle};
      min-height: 100vh;
      --tw-ring-color: var(--c-primary);
      transition: background-color 0.3s ease;
    }

    .shop-btn-primary {
      background-color: var(--c-primary);
      color: white;
      border-radius: var(--btn-radius);
      transition: filter 0.2s, transform 0.1s;
    }
    .shop-btn-primary:hover { filter: brightness(1.1); }
    .shop-btn-primary:active { transform: scale(0.97); }

    .shop-btn-outline {
      border: 2px solid var(--c-primary);
      color: var(--c-primary);
      border-radius: var(--btn-radius);
    }

    .shop-card, .tenant-card {
      border-radius: var(--card-radius);
      overflow: hidden;
    }

    /* Filtros y chips de categoría */
    .shop-filter, .shop-chip, .shop-category-chip {
      border-radius: var(--card-radius) !important;
    }

    .shop-glass, .glass-header {
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      background: ${config.colors.background === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.4)'} !important;
      border-bottom: 1px solid ${config.colors.background === '#ffffff' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'};
    }

    /* Tipografías base */
    ${config.design?.font_weight === 'light' ? '.tenant-theme { font-weight: 300; } .tenant-theme h1, .tenant-theme h2, .tenant-theme h3 { font-weight: 400; }' : ''}
    ${config.design?.font_weight === 'medium' ? '.tenant-theme { font-weight: 500; }' : ''}
    ${config.design?.font_weight === 'bold' ? '.tenant-theme { font-weight: 600; } .tenant-theme h1, .tenant-theme h2, .tenant-theme h3 { font-weight: 800; }' : ''}

    /* Reemplazos de Tailwind para el Theme */
    .tenant-theme .bg-blue-600 { background-color: var(--c-primary) !important; border-color: var(--c-primary) !important; }
    .tenant-theme .hover\\:bg-blue-700:hover { filter: brightness(0.9); background-color: var(--c-primary) !important; }
    .tenant-theme .text-blue-600 { color: var(--c-primary) !important; }
    .tenant-theme .bg-green-600 { background-color: var(--c-secondary) !important; }
    .tenant-theme .text-green-600 { color: var(--c-secondary) !important; }
    .tenant-theme .text-yellow-400 { color: var(--c-accent) !important; }

    .tenant-theme button {
      border-radius: var(--btn-radius) !important;
    }
    .tenant-theme input, .tenant-theme select, .tenant-theme textarea {
      border-radius: 6px !important;
    }

    ${config.design?.custom_css || ''}
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

export default memo(CSSVariables);
