import { useState, useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'
import { BarChart3, Leaf, Image, FileText, Award, Check, Headphones, AlertTriangle, X, Receipt } from 'lucide-react'
import { useConfig, useSetConfig } from '../context/ConfigContext'
import { useToastContext } from '../context/ToastContext'
import { buildConfig } from './Shop'

const BASE_MODULES = [
  { key: 'products',  label: 'Productos',    icon: '📦' },
  { key: 'orders',    label: 'Pedidos',      icon: '🛒' },
  { key: 'customers', label: 'Clientes',     icon: '👥' },
  { key: 'settings',  label: 'Configuración',icon: '⚙️' },
]

const INSTALLABLE_MODULES = [
  { key: 'analytics',      label: 'Analíticas',           desc: 'Gráficos de ventas, métricas por período y exportación de reportes.',                                               Icon: BarChart3, emoji: '📊' },
  { key: 'sustainability',  label: 'Sostenibilidad',        desc: 'Métricas de CO₂, puntuación ecológica de productos y filtros eco en la tienda.',                                    Icon: Leaf,      emoji: '🌱' },
  { key: 'gallery',         label: 'Galería de Imágenes',   desc: 'Gestión avanzada de medios. Sube y organiza imágenes para tus productos.',                                          Icon: Image,     emoji: '🖼️'  },
  { key: 'reports',         label: 'Incidencias',           desc: 'Gestiona incidencias y reportes internos de tu equipo.',                                                            Icon: FileText,  emoji: '📋' },
  { key: 'certifications',  label: 'Certificaciones',       desc: 'Asigna sellos ecológicos y de calidad (EPEAT, FSC, EU Ecolabel) a tus productos.',                                  Icon: Award,     emoji: '🏆' },
  { key: 'tickets',         label: 'Tickets de Soporte',    desc: 'Permite a tus clientes abrir tickets desde la tienda y gestiona las consultas desde el panel.',                     Icon: Headphones,emoji: '🎫' },
  { key: 'invoices',        label: 'Facturación',           desc: 'Genera y descarga facturas PDF automáticamente al confirmar cada pedido. Accesibles para el CEO y el cliente.',    Icon: Receipt,   emoji: '🧾' },
  { key: 'discounts',       label: 'Descuentos y Envío',    desc: 'Crea códigos de descuento y configura tarifas de envío para tu tienda.',                                            Icon: Receipt,   emoji: '🏷️' },
]

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')

// ── ModuleCard ────────────────────────────────────────────────────────────────
function ModuleCard({ module, isActive, primary, onInstall, onRequestUninstall }) {
  const cardRef     = useRef(null)
  const progressRef = useRef(null)
  const iconRef     = useRef(null)
  const [busy, setBusy]             = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstallClick = async () => {
    if (busy) return
    setBusy(true)
    setIsInstalling(true)
    // esperamos a que React pinte la barra de progreso antes de que GSAP la toque
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    const animDone = new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve })
      tl.to(cardRef.current, { scale: 0.97, duration: 0.1, ease: 'power2.in' })
        .to(progressRef.current, { width: '100%', duration: 1.2, ease: 'power1.inOut' }, 0.1)
        .to(iconRef.current,     { rotation: 360, duration: 1.2, ease: 'linear'        }, 0.1)
        .to(cardRef.current, { scale: 1.02, duration: 0.2 })
        .to(cardRef.current, { scale: 1,    duration: 0.15 })
    })

    await Promise.all([animDone, onInstall(module.key)])
    setBusy(false)
    setIsInstalling(false)
  }

  const handleUninstallClick = () => {
    onRequestUninstall(module.key, module.label, cardRef)
  }

  const borderColor = isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'
  const bgColor     = isActive ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)'

  return (
    <div
      ref={cardRef}
      className="module-card"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.3s',
      }}
    >
      {/* barra de progreso — solo visible mientras se instala */}
      {busy && !isActive && (
        <div
          ref={progressRef}
          style={{
            position: 'absolute', bottom: 0, left: 0, height: '3px',
            background: primary, width: '0%',
          }}
        />
      )}

      {/* icono */}
      <div ref={iconRef} style={{ fontSize: '32px', marginBottom: '12px', display: 'inline-block' }}>
        {module.emoji}
      </div>

      {/* información */}
      <h3 style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '6px', fontSize: '15px' }}>
        {module.label}
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
        {module.desc}
      </p>

      {/* pie de tarjeta */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
          color: isActive ? '#22c55e' : '#64748b',
        }}>
          {isActive ? '● Activo' : '○ Inactivo'}
        </span>

        <button
          onClick={isActive ? handleUninstallClick : handleInstallClick}
          disabled={busy}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '13px',
            background: isActive ? 'rgba(239,68,68,0.1)' : primary,
            color: isActive ? '#ef4444' : '#fff',
            opacity: busy ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {busy && isInstalling ? 'Instalando...' : busy ? 'Desinstalando...' : isActive ? 'Desinstalar' : 'Instalar'}
        </button>
      </div>
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ target, onConfirm, onCancel }) {
  const overlayRef = useRef(null)
  const modalRef   = useRef(null)

  useEffect(() => {
    if (!modalRef.current) return
    gsap.fromTo(
      modalRef.current,
      { opacity: 0, scale: 0.9, y: -20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'back.out(1.7)' }
    )
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
  }, [])

  const handleCancel = () => {
    gsap.to(modalRef.current,   { opacity: 0, scale: 0.9, y: -10, duration: 0.15 })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.15, onComplete: onCancel })
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div
        ref={modalRef}
        style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
          borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444' }} />
          </div>
          <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '17px' }}>
            ¿Desinstalar {target.label}?
          </h3>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
          Esta acción ocultará todas las funciones de <strong style={{ color: '#f1f5f9' }}>{target.label}</strong> de tu panel y la tienda pública. Puedes volver a activarlo en cualquier momento.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Desinstalar
          </button>
        </div>

        <button
          onClick={handleCancel}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: 'var(--text-hint)', cursor: 'pointer',
          }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>
  )
}

// ── Modules (main) ────────────────────────────────────────────────────────────
const Modules = () => {
  const config    = useConfig()
  const setConfig = useSetConfig()
  const { showSuccess, showError } = useToastContext()
  const primary   = config?.colors?.primary || '#6366f1'

  const [features,      setFeatures]      = useState({})
  const [loading,       setLoading]       = useState(true)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const containerRef = useRef(null)

  // cargamos las features de la tienda
  useEffect(() => {
    fetch('/api/store/me/features', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setFeatures(data.data) })
      .catch(e => console.error('Error loading features:', e))
      .finally(() => setLoading(false))
  }, [])

  // animación de entrada en cascada al cargar
  useEffect(() => {
    if (loading || !containerRef.current) return
    gsap.fromTo(
      containerRef.current.querySelectorAll('.module-card'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
    )
  }, [loading])

  const refreshConfig = useCallback(async () => {
    try {
      const r = await fetch('/api/public/tenant-check')
      const d = await r.json()
      if (d.success && d.tenant) setConfig(buildConfig(d.tenant))
    } catch (_) {}
  }, [setConfig])

  const handleInstall = useCallback(async (key) => {
    try {
      const res  = await fetch('/api/store/me/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ features: { [key]: true } }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setFeatures(data.data)
      showSuccess(`Módulo "${INSTALLABLE_MODULES.find(m => m.key === key)?.label}" activado`)
      await refreshConfig()
    } catch (e) {
      showError(e.message || 'Error al instalar el módulo')
    }
  }, [showSuccess, showError, refreshConfig])

  const handleRequestUninstall = useCallback((key, label, cardRef) => {
    setConfirmTarget({ key, label, cardRef })
  }, [])

  const handleConfirmUninstall = async () => {
    const { key, label, cardRef } = confirmTarget
    setConfirmTarget(null)

    // animación de sacudida
    gsap.to(cardRef.current, {
      keyframes: { x: [-8, 8, -6, 6, -4, 4, 0] },
      duration: 0.4,
      ease: 'none',
    })
    // destello rojo con boxShadow
    gsap.to(cardRef.current, {
      boxShadow: '0 0 0 2px #ef4444',
      duration: 0.3,
      delay: 0.1,
      onComplete: () => gsap.to(cardRef.current, { boxShadow: 'none', duration: 0.6, delay: 0.4 }),
    })

    try {
      const res  = await fetch('/api/store/me/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ features: { [key]: false } }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setFeatures(data.data)
      showSuccess(`Módulo "${label}" desactivado`)
      await refreshConfig()
    } catch (e) {
      showError(e.message || 'Error al desinstalar el módulo')
    }
  }

  return (
    <div>
      {/* módulos base */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '20px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
          Módulos base — siempre activos
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {BASE_MODULES.map(m => (
            <div key={m.key} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)', borderRadius: '20px',
              fontSize: '13px', color: '#94a3b8',
            }}
              title="Este módulo es parte del plan base">
              <Check style={{ width: 12, height: 12, color: '#22c55e', flexShrink: 0 }} />
              {m.icon} {m.label}
              <span style={{
                marginLeft: '4px', padding: '1px 8px', borderRadius: '10px',
                background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '10px', fontWeight: 700,
              }}>
                Incluido
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* módulos instalables */}
      <p style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
        Módulos instalables
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{
            width: 28, height: 28, border: `3px solid ${primary}30`,
            borderTopColor: primary, borderRadius: '50',
            animation: 'spin 0.8s linear infinite',
          }} className="animate-spin" />
        </div>
      ) : (
        <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {INSTALLABLE_MODULES.map(module => (
            <ModuleCard
              key={module.key}
              module={module}
              isActive={features[module.key] !== false}
              primary={primary}
              onInstall={handleInstall}
              onRequestUninstall={handleRequestUninstall}
            />
          ))}
        </div>
      )}

      {/* modal de confirmación */}
      {confirmTarget && (
        <ConfirmModal
          target={confirmTarget}
          onConfirm={handleConfirmUninstall}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}

export default Modules
