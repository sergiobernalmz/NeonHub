require('dotenv').config();
const { User, Role, Store } = require('./src/models');

async function checkUser() {
    try {
        const user = await User.findOne({
            where: { username: 'ceo' },
            include: [
                { model: Role, as: 'roles' },
                { model: Store, as: 'store' }
            ]
        });

        if (user) {
            console.log("User found:");
            console.log(`ID: ${user.id}`);
            console.log(`Username: ${user.username}`);
            console.log(`Store ID: ${user.store_id}`);
            console.log(`Roles:`, user.roles.map(r => r.name));
        } else {
            console.log("User 'ceo' not found.");
        }

        const stores = await Store.findAll();
        console.log("Stores:", stores.map(s => ({ id: s.id, name: s.name, domain: s.domain })));

        const roles = await Role.findAll();
        console.log("Roles:", roles.map(r => ({ id: r.id, name: r.name, level: r.level })));

    } catch (error) {
        console.error("Error connecting to DB:", error);
    } finally {
        process.exit(0);
    }
}

checkUser();
