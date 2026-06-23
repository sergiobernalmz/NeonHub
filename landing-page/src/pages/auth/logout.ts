import type { APIRoute } from 'astro';
import { deleteSession } from '../../lib/db';

export const POST: APIRoute = async ({ cookies, redirect }) => {
    const sessionId = cookies.get('app_auth_token')?.value;

    if (sessionId) {
        await deleteSession(sessionId);
        cookies.delete('app_auth_token', { path: '/' });
    }

    return redirect('/login');
};
