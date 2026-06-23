module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'theme_preference', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: 'dark',
      after: 'address'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'theme_preference');
  }
};
