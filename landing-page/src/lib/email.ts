import nodemailer from 'nodemailer';

export async function sendVerificationEmail({ email, username, token }: { email: string, username: string, token: string }) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.buzondecorreo.com',
      port: 465,
      secure: true,
      auth: {
        user: 'soporte@neonhub.es',
        pass: 'SergioBM2002@'
      }
    });

    const verificationLink = `https://neonhub.es/verificar?token=${token}`;

    const mailOptions = {
        from: '"NeonHub" <soporte@neonhub.es>',
        to: email,
        subject: 'Verifica tu cuenta en NeonHub',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #333; border-radius: 8px; background-color: #0d1117; color: #e6edf3;">
        <h2 style="color: #00f0ff;">¡Bienvenido a NeonHub!</h2>
        <p>Hola ${username},</p>
        <p>Gracias por registrarte. Para completar tu registro y acceder a la plataforma, por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi correo</a>
        </div>
        <p>Si no has creado esta cuenta, puedes ignorar este correo.</p>
        <p>Saludos,<br>El equipo de NeonHub</p>
      </div>
    `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email de verificación enviado a ${email}`);
  } catch (err) {
    console.error('Error enviando email de verificación:', err);
  }
}
