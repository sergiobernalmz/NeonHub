import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, CreditCard, Rocket, Clock, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OnboardingPending = () => {
    const { user } = useAuth();
    const plan = user?.preferences?.pending_plan || 'Consultoría';

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl w-full"
            >
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-6 shadow-lg shadow-violet-500/20">
                        <Rocket className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        ¡Tu proyecto ha despegado!
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Gracias por confiar en NeonHub. Hemos recibido tu solicitud para el plan <span className="text-violet-400 font-bold uppercase">{plan}</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Status Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-8 rounded-2xl"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-yellow-500/20 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Estado Actual</h3>
                                <p className="text-yellow-400 font-medium">Pendiente de Configuración</p>
                            </div>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            Nuestro equipo de desarrolladores está revisando tu solicitud. En breve nos pondremos en contacto contigo para finalizar los detalles y configurar tu entorno.
                        </p>
                    </motion.div>

                    {/* Contact Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-500/30 p-8 rounded-2xl"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-violet-500/20 rounded-lg">
                                <MessageSquare className="w-6 h-6 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Contactar con Devs</h3>
                                <p className="text-violet-300 font-medium">Gestión Directa</p>
                            </div>
                        </div>
                        <p className="text-gray-300 mb-6">
                            ¿Tienes prisa o preguntas específicas? Escríbenos directamente para agilizar el proceso.
                        </p>
                        <a
                            href="mailto:soporte@neonhub.es?subject=Activación Plan ${plan} - ${user.username}"
                            className="inline-flex items-center justify-center w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors gap-2"
                        >
                            <Mail className="w-4 h-4" />
                            Enviar Correo
                        </a>
                    </motion.div>
                </div>

                {/* Steps */}
                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <h3 className="text-xl font-bold text-white mb-6">Próximos Pasos</h3>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 opacity-50">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <h4 className="font-medium text-white">Registro Completado</h4>
                                <p className="text-sm text-gray-400">Tu cuenta ha sido creada exitosamente.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1 animate-pulse">
                                <span className="text-blue-400 font-bold">2</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-blue-400">Validación y Pago</h4>
                                <p className="text-sm text-gray-300">
                                    El equipo validará tu proyecto y te enviará el enlace de pago seguro para el plan <strong>{plan}</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 opacity-50">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-gray-400 font-bold">3</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-white">Acceso al Dashboard</h4>
                                <p className="text-sm text-gray-400">Una vez confirmado, tendrás acceso total a tus herramientas.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OnboardingPending;
