import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react'
import API_BASE_URL from '../config/api'

const VerifyEmail = () => {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const navigate = useNavigate()

    const [status, setStatus] = useState('verifying')
    const [message, setMessage] = useState('Verificando tu correo electrónico...')

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('Token de verificación no encontrado.')
            return
        }

        const verify = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                })

                const data = await response.json()

                if (response.ok && data.success) {
                    setStatus('success')
                    setMessage(data.message || '¡Correo verificado con éxito!')
                } else {
                    setStatus('error')
                    setMessage(data.message || 'Error al verificar el correo.')
                }
            } catch (error) {
                console.error('Error al verificar email:', error)
                setStatus('error')
                setMessage('Error de conexión. Intenta nuevamente más tarde.')
            }
        }

        verify()
    }, [token, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md p-8 bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl"
            >
                <div className="text-center">
                    {status === 'verifying' && (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"
                            />
                            <h2 className="text-2xl font-bold text-white mb-2">Verifcando...</h2>
                            <p className="text-gray-400">{message}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-white mb-2">¡Verificado!</h2>
                            <p className="text-gray-300 mb-8">{message}</p>
                            <Link
                                to="/login"
                                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full justify-center"
                            >
                                Iniciar Sesión
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <XCircle className="w-10 h-10 text-red-500" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
                            <p className="text-red-400 mb-8">{message}</p>
                            <Link
                                to="/login"
                                className="inline-block text-gray-400 hover:text-white transition-colors"
                            >
                                Volver al Login
                            </Link>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default VerifyEmail
