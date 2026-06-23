'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = [
      {
        id: uuidv4(),
        name: 'ceo',
        display_name: 'CEO Tienda',
        description: 'CEO / Propietario de la tienda - Control total de su negocio',
        permissions: JSON.stringify([
          'users.create', 'users.read', 'users.update', 'users.delete',
          'roles.create', 'roles.read', 'roles.update', 'roles.delete',
          'products.create', 'products.read', 'products.update', 'products.delete',
          'categories.create', 'categories.read', 'categories.update', 'categories.delete',
          'customers.create', 'customers.read', 'customers.update', 'customers.delete',
          'orders.create', 'orders.read', 'orders.update', 'orders.delete',
          'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
          'sustainability.create', 'sustainability.read', 'sustainability.update', 'sustainability.delete',
          'reports.read', 'reports.export',
          'system.settings', 'system.backup', 'system.logs',
          'shop.access', 'shop.manage',
          'user.management', 'role.assignment'
        ]),
        level: 100,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'admin',
        display_name: 'Administrador',
        description: 'Administrador del sistema con acceso al dashboard',
        permissions: JSON.stringify([
          'users.read',
          'products.create', 'products.read', 'products.update', 'products.delete',
          'categories.create', 'categories.read', 'categories.update', 'categories.delete',
          'customers.create', 'customers.read', 'customers.update', 'customers.delete',
          'orders.create', 'orders.read', 'orders.update', 'orders.delete',
          'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
          'sustainability.read', 'sustainability.update',
          'reports.read', 'reports.export',
          'shop.access', 'shop.view',
          'dashboard.access'
        ]),
        level: 80,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'manager',
        display_name: 'Gerente',
        description: 'Gerente con permisos de gestión',
        permissions: JSON.stringify([
          'products.read', 'products.update',
          'customers.create', 'customers.read', 'customers.update',
          'orders.create', 'orders.read', 'orders.update',
          'invoices.create', 'invoices.read', 'invoices.update',
          'sustainability.read',
          'reports.read'
        ]),
        level: 60,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'employee',
        display_name: 'Empleado',
        description: 'Empleado con permisos básicos',
        permissions: JSON.stringify([
          'products.read',
          'customers.read',
          'orders.read',
          'invoices.read',
          'sustainability.read'
        ]),
        level: 40,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'viewer',
        display_name: 'Visualizador',
        description: 'Solo lectura del sistema',
        permissions: JSON.stringify([
          'products.read',
          'customers.read',
          'orders.read',
          'invoices.read'
        ]),
        level: 20,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'customer',
        display_name: 'Cliente',
        description: 'Usuario cliente con acceso solo a la tienda',
        permissions: JSON.stringify([
          'shop.access',
          'shop.purchase',
          'profile.read',
          'profile.update'
        ]),
        level: 10,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'ceo_neonhub',
        display_name: 'CEO NeonHub',
        description: 'CEO de NeonHub - Control global del sistema SaaS y acceso a todas las tiendas',
        permissions: JSON.stringify([
          '*'
        ]),
        level: 100,
        is_system: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // insertamos los roles uno a uno comprobando si ya existen
    for (const role of roles) {
      const [existingRole] = await queryInterface.sequelize.query(
        `SELECT id FROM roles WHERE name = '${role.name}' LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      if (!existingRole) {
        await queryInterface.bulkInsert('roles', [role]);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', {
      is_system: true
    });
  }
};