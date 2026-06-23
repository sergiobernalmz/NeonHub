import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'electron' ? './' : '/',
  plugins: [
    {
      name: 'electron-remove-crossorigin',
      transformIndexHtml: (html) => html.replace(/ crossorigin/g, ''),
    },
    react({
    // Configuración más específica para React Refresh
    fastRefresh: true,
    babel: {
      plugins: []
    }
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',  // Permite acceso desde la red local
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    // Suprimir algunos warnings en desarrollo
    __DEV__: JSON.stringify(true)
  },
  esbuild: {
    // Configuración para reducir warnings innecesarios
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'commonjs-variable-in-esm': 'silent'
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vite/client', '@vite/env']
  }
}))
