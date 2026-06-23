import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, Palette, Crown, Star, Zap, Check, AlertTriangle, Image } from 'lucide-react'
import tenantService from '../services/tenantService'

const PLAN_LABELS = {
    starter: { name: 'Esencial', icon: Zap, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
    installation: { name: 'Profesional', icon: Star, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
    enterprise: { name: 'Premium', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
}

const StoreBrandingModal = ({ store, isOpen, onClose, onUpdated }) => {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [brandingData, setBrandingData] = useState(null)
    const [planFeatures, setPlanFeatures] = useState(null)
    const [formData, setFormData] = useState({
        primary_color: '#0ea5e9',
        secondary_color: '#6366f1',
        accent_color: '#22d3ee',
        dark_mode: true,
        store_description: ''
    })
    const [message, setMessage] = useState(null)

    useEffect(() => {
        if (isOpen && store) {
            loadBranding()
        }
    }, [isOpen, store])

    const loadBranding = async () => {
        try {
            setLoading(true)
            setMessage(null)
            const data = await tenantService.getStoreBranding(store.id)
            setBrandingData(data)
            setPlanFeatures(data.plan)
            setFormData({
                primary_color: data.branding.primary_color || '#0ea5e9',
                secondary_color: data.branding.secondary_color || '#6366f1',
                accent_color: data.branding.accent_color || '#22d3ee',
                dark_mode: data.branding.dark_mode ?? true,
                store_description: data.branding.store_description || ''
            })
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al cargar el branding: ' + error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            setMessage(null)
            await tenantService.updateStoreBranding(store.id, formData)
            setMessage({ type: 'success', text: 'Branding actualizado correctamente' })
            onUpdated?.()
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message
            setMessage({ type: 'error', text: errorMsg })
        } finally {
            setSaving(false)
        }
    }

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        if (file.size > 1 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'El logo no puede superar 1 MB' })
            return
        }

        try {
            setUploadingLogo(true)
            setMessage(null)
            const result = await tenantService.uploadStoreLogo(store.id, file)
            setBrandingData(prev => ({
                ...prev,
                branding: { ...prev.branding, logo_url: result.data.logo_url }
            }))
            setMessage({ type: 'success', text: 'Logo actualizado' })
            onUpdated?.()
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message
            setMessage({ type: 'error', text: errorMsg })
        } finally {
            setUploadingLogo(false)
            event.target.value = ''
        }
    }

    if (!isOpen) return null

    const planId = brandingData?.plan_id || store?.plan_id || 'starter'
    const planLabel = PLAN_LABELS[planId] || PLAN_LABELS.starter
    const PlanIcon = planLabel.icon
    const canCustomize = planFeatures?.canCustomColors || false
    const canLogo = planFeatures?.canCustomLogo || false

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-purple-400" />
                            Personalizar Tienda
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
                            {/* Plan Badge */}
                            <div className={`flex items-center justify-between p-4 rounded-xl ${planLabel.bg} border ${planLabel.border}`}>
                                <div className="flex items-center gap-3">
                                    <PlanIcon className={`w-6 h-6 ${planLabel.color}`} />
                                    <div>
                                        <p className={`font-semibold ${planLabel.color}`}>Plan {planLabel.name}</p>
                                        <p className="text-gray-400 text-xs">{planFeatures?.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex flex-col gap-1 text-xs">
                                        <span className={`flex items-center gap-1 ${canLogo ? 'text-green-400' : 'text-gray-500'}`}>
                                            {canLogo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Logo personalizado
                                        </span>
                                        <span className={`flex items-center gap-1 ${canCustomize ? 'text-green-400' : 'text-gray-500'}`}>
                                            {canCustomize ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Colores personalizados
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Logo Section */}
                            <div className="space-y-3">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Image className="w-4 h-4 text-gray-400" />
                                    Logo de la Tienda
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-gray-700/50 border border-gray-600 flex items-center justify-center overflow-hidden">
                                        {brandingData?.branding?.logo_url ? (
                                            <img
                                                src={brandingData.branding.logo_url}
                                                alt="Logo"
                                                className="w-full h-full object-contain p-1"
                                            />
                                        ) : (
                                            <span className="text-gray-500 text-2xl font-bold">
                                                {store?.name?.charAt(0)?.toUpperCase() || 'N'}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        {canLogo ? (
                                            <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg cursor-pointer transition-colors inline-flex items-center gap-2">
                                                <Upload className="w-4 h-4" />
                                                {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.webp,.svg"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                    disabled={uploadingLogo}
                                                />
                                            </label>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                                Disponible en plan Profesional o superior
                                            </div>
                                        )}
                                        <p className="text-gray-500 text-xs mt-1">JPG, PNG, WebP o SVG. Máx 1 MB.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Colors Section */}
                            <div className="space-y-3">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-gray-400" />
                                    Colores de la Marca
                                    {!canCustomize && (
                                        <span className="text-xs text-yellow-500 font-normal">(Plan Profesional requerido)</span>
                                    )}
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1.5">Color Primario</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={formData.primary_color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                                                disabled={!canCustomize}
                                                className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                                            />
                                            <input
                                                type="text"
                                                value={formData.primary_color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                                                disabled={!canCustomize}
                                                className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1.5">Color Secundario</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={formData.secondary_color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                                                disabled={!canCustomize}
                                                className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                                            />
                                            <input
                                                type="text"
                                                value={formData.secondary_color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                                                disabled={!canCustomize}
                                                className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1.5">Color Acento</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={formData.accent_color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                                                disabled={!canCustomize}
                                                className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                                            />
                                            <input
                                                type="text"
                                                value={formData.accent_color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                                                disabled={!canCustomize}
                                                className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm disabled:opacity-50"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Color Preview */}
                                {canCustomize && (
                                    <div className="flex gap-2 mt-2">
                                        <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: formData.primary_color }} />
                                        <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: formData.secondary_color }} />
                                        <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: formData.accent_color }} />
                                    </div>
                                )}
                            </div>

                            {/* Dark Mode Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                                <div>
                                    <p className="text-white text-sm font-medium">Modo Oscuro</p>
                                    <p className="text-gray-400 text-xs">Interfaz oscura para la tienda</p>
                                </div>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, dark_mode: !prev.dark_mode }))}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${formData.dark_mode ? 'bg-purple-600' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.dark_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-white text-sm font-medium">Descripción de la Tienda</label>
                                <textarea
                                    value={formData.store_description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, store_description: e.target.value }))}
                                    placeholder="Breve descripción de la tienda..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none"
                                />
                                <p className="text-gray-500 text-xs text-right">{formData.store_description.length}/500</p>
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                    }`}>
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
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
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

export default StoreBrandingModal
