import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Globe, Link, AlertTriangle, Check } from 'lucide-react'
import tenantService from '../services/tenantService'

const EditTenantModal = ({ store, isOpen, onClose, onUpdated }) => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)
    const [formData, setFormData] = useState({
        custom_domain: '',
        url_mapping: ''
    })

    const handleOpen = async () => {
        setMessage(null)
        setLoading(true)
        try {
            const data = await tenantService.getStoreDetails(store.id)
            const urlMapping = data.url_mapping || {}
            setFormData({
                custom_domain: data.custom_domain || '',
                url_mapping: JSON.stringify(urlMapping, null, 2)
            })
        } catch (error) {
            const urlMapping = store.url_mapping || {}
            setFormData({
                custom_domain: store.custom_domain || '',
                url_mapping: JSON.stringify(urlMapping, null, 2)
            })
            setMessage({ type: 'warning', text: 'No se pudieron cargar los datos actuales. Editando desde valores locales.' })
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        if (isOpen && store) {
            handleOpen()
        }
    }, [isOpen, store])

    const validateJson = (str) => {
        if (!str.trim()) return { valid: true, parsed: {} }
        try {
            const parsed = JSON.parse(str)
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                return { valid: false, error: 'Debe ser un objeto JSON (clave: valor)' }
            }
            return { valid: true, parsed }
        } catch {
            return { valid: false, error: 'JSON inválido' }
        }
    }

    const handleSave = async () => {
        const validation = validateJson(formData.url_mapping)
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error })
            return
        }

        try {
            setSaving(true)
            setMessage(null)
            const payload = {
                custom_domain: formData.custom_domain.trim() || null,
                url_mapping: validation.parsed
            }
            await tenantService.updateStoreSettings(store.id, payload)
            setMessage({ type: 'success', text: 'Dominio y rutas actualizados correctamente' })
            onUpdated?.()
            setTimeout(onClose, 1200)
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message
            setMessage({ type: 'error', text: errorMsg })
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Globe className="w-5 h-5 text-cyan-400" />
                            Dominios y Rutas
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">{store?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Custom Domain */}
                            <div className="space-y-3">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    Dominio Personalizado
                                </h3>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.custom_domain}
                                        onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
                                        placeholder="tienda.ejemplo.com"
                                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-300">
                                        Configura un CNAME en tu DNS apuntando a <code className="bg-blue-500/20 px-1 rounded">{store?.subdomain}.neonhub.es</code> antes de activar el dominio.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                                    <div className="text-xs text-gray-400">
                                        <span className="text-gray-500">Estado actual:</span>{' '}
                                        {store.custom_domain ? (
                                            <span className="text-green-400 font-medium">{store.custom_domain}</span>
                                        ) : (
                                            <span className="text-gray-500 italic">No configurado</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* URL Mapping */}
                            <div className="space-y-3">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Link className="w-4 h-4 text-gray-400" />
                                    Mapeo de Rutas
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Define rutas personalizadas como JSON. Ejemplo: <code className="bg-gray-700 px-1 rounded text-cyan-400">{"{ \"ofertas\": \"/products/sale\" }"}</code>
                                </p>
                                <textarea
                                    value={formData.url_mapping}
                                    onChange={(e) => setFormData(prev => ({ ...prev, url_mapping: e.target.value }))}
                                    placeholder='{\n  "ofertas": "/products/sale",\n  "nuevos": "/products/new"\n}'
                                    rows={8}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-sm font-mono placeholder-gray-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent resize-none"
                                />
                                {formData.url_mapping.trim() && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-900/50 border border-gray-700 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs text-gray-400 font-mono">
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(formData.url_mapping)
                                                    return Object.keys(parsed).length + ' ruta(s) definida(s)'
                                                } catch {
                                                    return 'JSON inválido'
                                                }
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                                    message.type === 'success'
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                        : message.type === 'warning'
                                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                }`}>
                                    {message.type === 'success' && <Check className="w-4 h-4" />}
                                    {message.type === 'error' && <AlertTriangle className="w-4 h-4" />}
                                    {message.text}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && (
                    <div className="border-t border-gray-700 p-6 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Guardar Cambios
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

export default EditTenantModal