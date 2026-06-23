import { db, User, eq } from 'astro:db';
import { hashPassword } from '../src/lib/auth';

export default async function () {
    const existing = await db.select().from(User).where(eq(User.email, 'programador@neonhub.es'));
    if (existing.length === 0) {
        const password = await hashPassword('Admin123!');
        await db.insert(User).values({
            id: crypto.randomUUID(),
            username: 'Programador',
            email: 'programador@neonhub.es',
            password: password,
            role: 'admin',
            createdAt: new Date()
        });
        console.log("Admin user seeded: programador@neonhub.es");
    }
}
