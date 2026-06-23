'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // creamos la tabla de informes
        await queryInterface.createTable('reports', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            report_number: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },
            type: {
                type: Sequelize.ENUM(
                    'bug', 'feature_request', 'performance', 'security',
                    'customer_complaint', 'product_issue', 'return_request', 'order_problem',
                    'financial', 'strategic', 'analytics', 'audit', 'general'
                ),
                allowNull: false
            },
            category: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            title: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            priority: {
                type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
                allowNull: false,
                defaultValue: 'medium'
            },
            status: {
                type: Sequelize.ENUM(
                    'pending', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'
                ),
                allowNull: false,
                defaultValue: 'pending'
            },
            reporter_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            assigned_to: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            assigned_role: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            related_entity_type: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            related_entity_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            attachments: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: []
            },
            metadata: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: {}
            },
            resolution_notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            resolved_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            closed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            due_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            views_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            is_urgent: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // creamos la tabla de comentarios de informes
        await queryInterface.createTable('report_comments', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            report_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'reports',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            comment: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            attachments: {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: []
            },
            is_internal: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });

        // añadimos índices (report_number ya tiene índice por ser unique)
        await queryInterface.addIndex('reports', ['type']);
        await queryInterface.addIndex('reports', ['status']);
        await queryInterface.addIndex('reports', ['priority']);
        await queryInterface.addIndex('reports', ['reporter_id']);
        await queryInterface.addIndex('reports', ['assigned_to']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('report_comments');
        await queryInterface.dropTable('reports');
    }
};
