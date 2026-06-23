import React from 'react'

const toAbsoluteUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

const ShopFooter = ({ config, contrastClass, subContrastClass }) => {
  if (config.design?.show_powered_by === false && !config.design?.footer_text && (!config.design?.social_links || !Object.values(config.design.social_links).some(v => v))) {
    return null;
  }

  return (
    <footer className="py-12 mt-16 border-t glass-header relative overflow-hidden" style={{ borderColor: config.colors?.background === '#ffffff' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 text-center flex flex-col items-center gap-6 relative z-10">
        {config.logo && (config.design?.layout === 'modern' || config.design?.layout === 'minimal') && (
          <img src={config.logo} alt="Logo de la tienda" className="h-12 w-auto object-contain mb-2 opacity-80" />
        )}
        {config.design?.footer_text && (
          <p className={`text-base font-medium ${contrastClass}`}>{config.design.footer_text}</p>
        )}
        {config.design?.social_links && (Object.values(config.design.social_links).some(v => v)) && (
          <div className="flex items-center gap-6 my-2">
            {config.design.social_links.instagram && (
              <a href={toAbsoluteUrl(config.design.social_links.instagram)} target="_blank" rel="noopener noreferrer" className={`${subContrastClass} hover:text-[color:var(--tw-ring-color)] hover:scale-110 transition-all`}>
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {config.design.social_links.twitter && (
              <a href={toAbsoluteUrl(config.design.social_links.twitter)} target="_blank" rel="noopener noreferrer" className={`${subContrastClass} hover:text-[color:var(--tw-ring-color)] hover:scale-110 transition-all`}>
                <span className="sr-only">Twitter</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            )}
            {config.design.social_links.facebook && (
              <a href={toAbsoluteUrl(config.design.social_links.facebook)} target="_blank" rel="noopener noreferrer" className={`${subContrastClass} hover:text-[color:var(--tw-ring-color)] hover:scale-110 transition-all`}>
                <span className="sr-only">Facebook</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
              </a>
            )}
            {config.design.social_links.tiktok && (
              <a href={toAbsoluteUrl(config.design.social_links.tiktok)} target="_blank" rel="noopener noreferrer" className={`${subContrastClass} hover:text-[color:var(--tw-ring-color)] hover:scale-110 transition-all`}>
                <span className="sr-only">TikTok</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-4.17.07-8.33.07-12.5z"/></svg>
              </a>
            )}
          </div>
        )}
        {config?.features?.tickets !== false && (
          <a
            href="/shop/support"
            className={`text-xs ${subContrastClass} hover:opacity-80 transition-opacity`}
          >
            🎫 Soporte técnico
          </a>
        )}
        {config.design?.show_powered_by !== false && (
          <p className={`text-xs mt-2 ${subContrastClass} opacity-75 max-w-sm mx-auto tracking-wide`}>
            Desarrollado y potenciado por {' '}
            <a href="https://neonhub.es" target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--tw-ring-color)] hover:brightness-125 transition-all drop-shadow-sm">
              NeonHub
            </a>
          </p>
        )}
      </div>
    </footer>
  )
}

export default ShopFooter
