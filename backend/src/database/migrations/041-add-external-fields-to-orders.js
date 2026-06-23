'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('orders');

    // Garantizamos que orders.store_id exista antes de indexarlo. La migración 045
    // también lo añade pero corre DESPUÉS; aquí lo creamos si falta para que el
    // índice compuesto (external_id, store_id) no falle en una BD desde cero.
    if (!cols.store_id) {
      await queryInterface.addColumn('orders', 'store_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      await queryInterface.addIndex('orders', ['store_id'], {
        name: 'orders_store_id_idx'
      });
    }

    if (!cols.external_id) {
      await queryInterface.addColumn('orders', 'external_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'ID del pedido en la plataforma externa (Shopify, WooCommerce, etc.)'
      });
      await queryInterface.addIndex('orders', ['external_id', 'store_id'], {
        name: 'orders_external_id_store_id',
        unique: true,
        where: { external_id: { [Sequelize.Op.ne]: null } }
      });
    }

    if (!cols.source_platform) {
      await queryInterface.addColumn('orders', 'source_platform', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'neonhub',
        comment: 'Plataforma de origen: neonhub, shopify, woocommerce, api, etc.'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('orders', 'orders_external_id_store_id').catch(() => {});
    await queryInterface.removeColumn('orders', 'external_id').catch(() => {});
    await queryInterface.removeColumn('orders', 'source_platform').catch(() => {});
  }
};
