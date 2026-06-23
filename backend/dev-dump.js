const path = require('path');
const { sequelize } = require('./src/models/index');

let output = '';

try {
    for (const modelName in sequelize.models) {
        if (modelName === 'Sequelize') continue;
        const model = sequelize.models[modelName];

        output += `Model: ${modelName}\n`;

        const attrs = model.rawAttributes;
        for (const attrName in attrs) {
            if (attrName === 'createdAt' || attrName === 'updatedAt') continue;
            const attr = attrs[attrName];
            let typeStr = 'unknown';
            if (attr.type) {
                if (attr.type.key) typeStr = attr.type.key;
                else if (attr.type.constructor && attr.type.constructor.name) {
                    typeStr = attr.type.constructor.name.replace('DATATYPE', '').toUpperCase();
                }
            }
            output += `  ${attrName}: ${typeStr}\n`;
        }

        // comprobamos las asociaciones
        for (const assocName in model.associations) {
            const assoc = model.associations[assocName];
            output += `  -> [Assoc ${assoc.associationType}] ${assoc.target.name} (as ${assoc.as})\n`;
        }
        output += '\n';
    }

    console.log(output);
} catch (e) {
    console.error("Error al generar el esquema:", e);
}

process.exit(0);
