const { User } = require('./src/models');
const { Op } = require('sequelize');

async function deleteUser() {
    try {
        const searchTerm = 'sergiobernalfp';
        console.log(`Buscando usuario con email o username que contenga '${searchTerm}'...`);

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { email: { [Op.like]: `%${searchTerm}%` } },
                    { username: { [Op.like]: `%${searchTerm}%` } }
                ]
            }
        });

        if (users.length === 0) {
            console.log('No se encontraron usuarios.');
            return;
        }

        console.log(`Se encontraron ${users.length} usuario(s):`);
        users.forEach(u => console.log(`- ID: ${u.id}, User: ${u.username}, Email: ${u.email}`));

        for (const user of users) {
            // el modelo tiene paranoid: true, así que destroy() hace soft delete.
            // si queremos reutilizar el email hay que usar force: true.
            // usamos force: true para que pueda volver a registrarse con el mismo email.
            await user.destroy({ force: true });
            console.log(`Usuario ${user.email} (ID: ${user.id}) eliminado permanentemente.`);
        }

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
    } finally {
        process.exit();
    }
}

deleteUser();
