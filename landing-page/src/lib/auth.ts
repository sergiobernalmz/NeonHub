import bcrypt from 'bcryptjs';
import { createSessionRecord, findSession, deleteSession, findUserById, updateUserPassword } from './db';

export async function createSession(userId: string) {
    const sessionId = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days

    await createSessionRecord(sessionId, userId, expiresAt);

    return sessionId;
}

export async function validateSession(sessionId: string) {
    const session = await findSession(sessionId);
    if (!session) return null;

    if (session.expires_at < Math.floor(Date.now() / 1000)) {
        await deleteSession(sessionId);
        return null;
    }

    const user = await findUserById(session.user_id);
    if (!user) return null;

    return {
        session,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role,
            createdAt: user.created_at,
            emailVerified: user.email_verified ?? false
        }
    };
}

export async function hashPassword(password: string): Promise<string> {
    const rounds = 12; // bcrypt cost factor
    return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, hash: string, userId?: string): Promise<boolean> {
    if (hash.startsWith('$2')) {
        return bcrypt.compare(password, hash);
    }
    // Legacy SHA-256: hex string of exactly 64 characters
    if (/^[a-f0-9]{64}$/i.test(hash)) {
        const { createHash } = await import('crypto');
        const sha256 = createHash('sha256').update(password).digest('hex');
        if (sha256 !== hash) return false;
        // Lazy migration: re-hash to bcrypt and persist
        if (userId) {
            try {
                const newHash = await bcrypt.hash(password, 12);
                await updateUserPassword(userId, newHash);
            } catch {
                // migration failure is non-fatal
            }
        }
        return true;
    }
    return false;
}
