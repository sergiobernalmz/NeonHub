require('dotenv').config();
const { Sequelize, Op } = require('sequelize');
const db = require('./src/models');
const { User } = db;

async function deleteUser() {
    try {
        console.log('Buscando usuario sergio...');
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username: 'sergio' },
                    { email: 'sergiobernalfp@gmail.com' }
                ]
            },
            paranoid: false // Buscar incluso si está soft-deleted
        });

        if (!user) {
            console.log('❌ Usuario no encontrado.');
            return;
        }

        console.log(`✅ Encontrado usuario: ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);

        // borrado permanente para poder reutilizar el email/username
        await user.destroy({ force: true });
        console.log('🗑️  Usuario eliminado permanentemente (Force Delete).');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        // cerramos conexión y salimos
        process.exit();
    }
}

deleteUser();
