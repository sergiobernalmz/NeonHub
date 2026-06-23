const nodemailer = require('nodemailer');

// crear transporter de nodemailer
const createTransporter = async () => {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        console.log('⚠️ SMTP no configurado. Usando transporter mock.');
        return {
            sendMail: async (mailOptions) => {
                console.log('📧 MOCK EMAIL SENT:');
                console.log('From:', mailOptions.from);
                console.log('To:', mailOptions.to);
                console.log('Subject:', mailOptions.subject);
                console.log('Body:', mailOptions.text || mailOptions.html);
                return { messageId: 'mock-id' };
            }
        };
    }
};

const sendVerificationEmail = async (user, token) => {
    const transporter = await createTransporter();

    // usamos la variable de entorno del frontend o el valor por defecto
    const frontendUrl = process.env.FRONTEND_URL || 'https://neonhub.es';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"NeonHub" <noreply@neonhub.es>',
        to: user.email,
        subject: 'Verifica tu cuenta en NeonHub',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00f0ff;">¡Bienvenido a NeonHub!</h2>
        <p>Hola ${user.first_name || user.username},</p>
        <p>Gracias por registrarte. Para completar tu registro y acceder a la tienda, por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #00f0ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verificar mi correo</a>
        </div>
        <p>Si no has creado esta cuenta, puedes ignorar este correo.</p>
        <p>Saludos,<br>El equipo de NeonHub</p>
      </div>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email de verificación enviado:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error al enviar el email de verificación:', error);
        return false;
    }
};

const sendDeletionEmail = async (user) => {
    const transporter = await createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"NeonHub" <noreply@neonhub.es>',
        to: user.email,
        subject: 'Tu cuenta de NeonHub ha sido eliminada',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff0000;">Cuenta Eliminada</h2>
        <p>Hola ${user.first_name || user.username},</p>
        <p>Te informamos que tu cuenta en NeonHub ha sido eliminada permanentemente por un administrador.</p>
        <p>Si crees que esto es un error, por favor contacta con soporte.</p>
        <div style="text-align: center; margin: 30px 0;">
             <p style="color: #666;">Esperamos volver a verte pronto.</p>
        </div>
        <p>Saludos,<br>El equipo de NeonHub</p>
      </div>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email de eliminación enviado:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error al enviar el email de eliminación:', error);
        return false;
    }
};

const sendPasswordResetEmail = async (user, token) => {
    const transporter = await createTransporter();

    const frontendUrl = process.env.FRONTEND_URL || 'https://neonhub.es';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"NeonHub" <noreply@neonhub.es>',
        to: user.email,
        subject: 'Recuperación de contraseña — NeonHub',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00f0ff;">Recupera tu contraseña</h2>
        <p>Hola ${user.first_name || user.username},</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #00f0ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Restablecer contraseña</a>
        </div>
        <p>Este enlace caduca en <strong>1 hora</strong>.</p>
        <p>Si no has solicitado este cambio, puedes ignorar este correo. Tu contraseña no cambiará.</p>
        <p>Saludos,<br>El equipo de NeonHub</p>
      </div>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email de recuperación de contraseña enviado:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error al enviar el email de recuperación de contraseña:', error);
        return false;
    }
};

const sendContactEmail = async ({ name, email, subject, message }) => {
    const transporter = await createTransporter();
    const from = process.env.EMAIL_FROM || '"NeonHub" <noreply@neonhub.es>';

    try {
        await transporter.sendMail({
            from,
            to: 'soporte@neonhub.es',
            replyTo: email,
            subject: `[Contacto] ${subject} — ${name}`,
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#6366f1">Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:8px">${message}</p>
        </div>`
        });

        await transporter.sendMail({
            from,
            to: email,
            subject: 'Hemos recibido tu mensaje — NeonHub',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#6366f1">¡Mensaje recibido!</h2>
          <p>Hola ${name},</p>
          <p>Hemos recibido tu mensaje y te responderemos en menos de 24 horas laborables.</p>
          <p>El equipo de NeonHub</p>
        </div>`
        });

        return true;
    } catch (error) {
        console.error('Error al enviar el email de contacto:', error);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    sendDeletionEmail,
    sendPasswordResetEmail,
    sendContactEmail,
};
