import type { APIRoute } from 'astro';
import { findUserByVerificationToken, verifyUserEmail } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token as string | undefined;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, message: 'Token requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await findUserByVerificationToken(token.trim());

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido o expirado' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (user.email_verified) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyVerified: true,
          message: 'Correo ya verificado anteriormente',
          email: user.email,
          username: user.username
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await verifyUserEmail(user.id);

    return new Response(
      JSON.stringify({
        success: true,
        alreadyVerified: false,
        message: 'Correo verificado correctamente',
        email: user.email,
        username: user.username
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('verify-email API error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
