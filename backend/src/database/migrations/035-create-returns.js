'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id),
        store_id UUID NOT NULL REFERENCES stores(id),
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'closed')),
        reason VARCHAR(50) NOT NULL
          CHECK (reason IN ('defective', 'not_as_described', 'damaged', 'wrong_item', 'other')),
        description TEXT,
        refund_type VARCHAR(20) DEFAULT 'refund'
          CHECK (refund_type IN ('refund', 'exchange')),
        admin_comment TEXT,
        refund_amount DECIMAL(10,2),
        stripe_refund_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_returns_store_id ON returns(store_id);
      CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
      CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('returns');
  }
};
