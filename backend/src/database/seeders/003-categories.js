'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const categories = [
      {
        id: uuidv4(),
        name: 'Productos Ecológicos',
        slug: 'productos-ecologicos',
        description: 'Productos respetuosos con el medio ambiente',
        parent_id: null,
        sort_order: 1,
        is_active: true,
        metadata: JSON.stringify({
          icon: 'leaf',
          color: '#22c55e',
          featured: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Energía Renovable',
        slug: 'energia-renovable',
        description: 'Productos relacionados con energía sostenible',
        parent_id: null,
        sort_order: 2,
        is_active: true,
        metadata: JSON.stringify({
          icon: 'solar-panel',
          color: '#f59e0b',
          featured: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Reciclaje',
        slug: 'reciclaje',
        description: 'Productos reciclados y para reciclaje',
        parent_id: null,
        sort_order: 3,
        is_active: true,
        metadata: JSON.stringify({
          icon: 'recycle',
          color: '#06b6d4',
          featured: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Hogar Sostenible',
        slug: 'hogar-sostenible',
        description: 'Productos para un hogar más sostenible',
        parent_id: null,
        sort_order: 4,
        is_active: true,
        metadata: JSON.stringify({
          icon: 'home',
          color: '#8b5cf6',
          featured: false
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Transporte Verde',
        slug: 'transporte-verde',
        description: 'Soluciones de transporte ecológico',
        parent_id: null,
        sort_order: 5,
        is_active: true,
        metadata: JSON.stringify({
          icon: 'car-electric',
          color: '#10b981',
          featured: false
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Alimentación Orgánica',
        slug: 'alimentacion-organica',
        description: 'Productos alimentarios orgánicos y sostenibles',
        parent_id: null,
        sort_order: 6,
        is_active: true,
        metadata: JSON.stringify({
          icon: 'apple',
          color: '#ef4444',
          featured: false
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('categories', categories);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('categories', {
      slug: {
        [Sequelize.Op.in]: [
          'productos-ecologicos',
          'energia-renovable',
          'reciclaje',
          'hogar-sostenible',
          'transporte-verde',
          'alimentacion-organica'
        ]
      }
    });
  }
};