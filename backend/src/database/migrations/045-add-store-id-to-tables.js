'use strict';

// Añade store_id a todas las tablas que lo necesitan pero aún no lo tienen
// Basado en la estructura real de la BD en producción (VPS)

const TABLES = [
  { table: 'categories',         onDelete: 'SET NULL'  },
  { table: 'customers',          onDelete: 'SET NULL'  },
  { table: 'orders',             onDelete: 'SET NULL'  },
  { table: 'products',           onDelete: 'SET NULL'  },
  { table: 'users',              onDelete: 'SET NULL'  },
  { table: 'activation_tokens',  onDelete: 'CASCADE'   },
  { table: 'sso_tokens',         onDelete: 'CASCADE'   },
  { table: 'audit_logs',         onDelete: 'SET NULL'  },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const { table, onDelete } of TABLES) {
      // comprobamos si ya existe la columna antes de añadirla
      const tableDesc = await queryInterface.describeTable(table);
      if (tableDesc.store_id) {
        console.log(`045: ${table}.store_id ya existe, omitido.`);
        continue;
      }

      await queryInterface.addColumn(table, 'store_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete
      });

      await queryInterface.addIndex(table, ['store_id'], {
        name: `${table}_store_id_idx`
      });

      console.log(`045: store_id añadido a ${table}`);
    }

    // support_tickets ya tiene store_id pero sin FK formal — lo dejamos como está
    console.log('045: migración completada.');
  },

  down: async (queryInterface) => {
    for (const { table } of TABLES) {
      try {
        await queryInterface.removeIndex(table, `${table}_store_id_idx`);
        await queryInterface.removeColumn(table, 'store_id');
      } catch (e) {
        console.log(`045 down: no se pudo revertir ${table}, omitido.`);
      }
    }
  }
};
