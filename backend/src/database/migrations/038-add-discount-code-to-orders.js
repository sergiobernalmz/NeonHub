module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'discount_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      after: 'discount_amount'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'discount_code');
  }
};
