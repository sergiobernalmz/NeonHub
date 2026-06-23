import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
    columns: {
        id: column.text({ primaryKey: true }),
        username: column.text({ unique: true }),
        email: column.text({ unique: true }),
        password: column.text(),
        role: column.text({ default: 'user' }), // 'user' o 'admin'
        createdAt: column.date({ default: new Date() }),
    }
});

const Session = defineTable({
    columns: {
        id: column.text({ primaryKey: true }),
        userId: column.text({ references: () => User.columns.id }),
        expiresAt: column.number(),
    }
});

export default defineDb({
    tables: { User, Session }
});
