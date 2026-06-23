import React, { createContext, useContext, useState } from 'react';

// Map of standard route keys to their default paths
const DEFAULT_ROUTES = {
  shop:       '/shop',
  dashboard:  '/dashboard',
  products:   '/dashboard/products',
  orders:     '/dashboard/orders',
  profile:    '/shop/profile',
  settings:   '/shop/settings',
  support:    '/shop/support',
  tickets:    '/shop/tickets',
  login:      '/login',
  register:   '/register',
  checkout:   '/checkout',
};

// Este contexto debe envolver la app en el entrypoint (por ejemplo, en App.jsx o main.jsx)
// Recibe el objeto config (con sections, design, etc) y lo expone globalmente

const ConfigContext = createContext();

export const ConfigProvider = ({ config: initialConfig, children }) => {
  const [config, setConfig] = useState(initialConfig);

  /**
   * Resolves a mapped URL path for a given standard route key.
   * If the store has a custom url_mapping (e.g. { "shop": "/tienda" }),
   * returns the custom path; otherwise returns the default.
   *
   * @param {string} standardRoute - Key such as 'shop', 'dashboard', 'products', etc.
   * @returns {string} The resolved path (custom if available, else default).
   */
  const getRoute = (standardRoute) => {
    const mapping = config?.url_mapping;
    if (mapping && typeof mapping === 'object' && mapping[standardRoute]) {
      return mapping[standardRoute];
    }
    return DEFAULT_ROUTES[standardRoute] || `/${standardRoute}`;
  };

  return (
    <ConfigContext.Provider value={{ config, setConfig, getRoute }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfig debe usarse dentro de ConfigProvider');
  return context.config;
};

export const useSetConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useSetConfig debe usarse dentro de ConfigProvider');
  return context.setConfig;
};

/** Returns the getRoute(standardRoute) function from context */
export const useGetRoute = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useGetRoute debe usarse dentro de ConfigProvider');
  return context.getRoute;
};
