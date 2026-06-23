'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_change_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        origin VARCHAR(20) NOT NULL CHECK (origin IN ('dashboard', 'landing')),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pct_token ON password_change_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_pct_email ON password_change_tokens(email);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('password_change_tokens');
  }
};
