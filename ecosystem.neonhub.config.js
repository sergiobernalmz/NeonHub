const path = require('path');
const ROOT_PATH = __dirname;

module.exports = {
  apps: [
    {
      name: 'neonhub-backend',
      cwd: `${ROOT_PATH}/backend`,
      script: 'src/server.js',
      exec_mode: 'cluster',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        FRONTEND_URL: process.env.FRONTEND_URL,
        TENANT_BASE_DOMAIN: process.env.TENANT_BASE_DOMAIN,
        CORS_ORIGINS: process.env.CORS_ORIGINS,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_DIALECT: process.env.DB_DIALECT,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        ADMIN_API_SECRET: process.env.ADMIN_API_SECRET,
        SERVICE_API_KEY: process.env.SERVICE_API_KEY
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        FRONTEND_URL: process.env.FRONTEND_URL,
        TENANT_BASE_DOMAIN: process.env.TENANT_BASE_DOMAIN,
        CORS_ORIGINS: process.env.CORS_ORIGINS,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_DIALECT: process.env.DB_DIALECT,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        ADMIN_API_SECRET: process.env.ADMIN_API_SECRET,
        SERVICE_API_KEY: process.env.SERVICE_API_KEY
      },
      error_file: `${ROOT_PATH}/logs/backend-error.log`,
      out_file: `${ROOT_PATH}/logs/backend-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    },
    {
      name: 'neonhub-frontend',
      cwd: `${ROOT_PATH}/frontend`,
      script: 'npx',
      args: 'serve dist -s -l tcp://0.0.0.0:3000',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: `${ROOT_PATH}/logs/frontend-error.log`,
      out_file: `${ROOT_PATH}/logs/frontend-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    },
    {
      name: 'neonhub-landing',
      cwd: `${ROOT_PATH}/landing-page`,
      script: 'node',
      args: 'server.mjs',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 5000,
        PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
        PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL,
        ADMIN_API_SECRET: process.env.ADMIN_API_SECRET,
        N8N_VERIFY_EMAIL_WEBHOOK: process.env.N8N_VERIFY_EMAIL_WEBHOOK,
        LANDING_DB_HOST: process.env.LANDING_DB_HOST,
        LANDING_DB_PORT: process.env.LANDING_DB_PORT,
        LANDING_DB_NAME: process.env.LANDING_DB_NAME,
        LANDING_DB_USER: process.env.LANDING_DB_USER,
        LANDING_DB_PASSWORD: process.env.LANDING_DB_PASSWORD
      },
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 5000,
        PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
        PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL,
        ADMIN_API_SECRET: process.env.ADMIN_API_SECRET,
        N8N_VERIFY_EMAIL_WEBHOOK: process.env.N8N_VERIFY_EMAIL_WEBHOOK,
        LANDING_DB_HOST: process.env.LANDING_DB_HOST,
        LANDING_DB_PORT: process.env.LANDING_DB_PORT,
        LANDING_DB_NAME: process.env.LANDING_DB_NAME,
        LANDING_DB_USER: process.env.LANDING_DB_USER,
        LANDING_DB_PASSWORD: process.env.LANDING_DB_PASSWORD
      },
      error_file: `${ROOT_PATH}/logs/landing-error.log`,
      out_file: `${ROOT_PATH}/logs/landing-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
