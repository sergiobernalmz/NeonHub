import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save, User, Bell, Shield, Palette, Globe, Store, Monitor, Smartphone, Tablet, X, LogOut, LayoutGrid, Sun, Moon, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useLanguage } from '../context/LanguageContext'
import Modules from './Modules'
import { useToastContext } from '../context/ToastContext'
import { useSetConfig, useConfig } from '../context/ConfigContext'
import { buildConfig } from './Shop'

const PRESET_THEMES = [
  { id:'void',       name:'Void',      category:'Oscuro',   primary:'#8b5cf6', secondary:'#7c3aed', accent:'#c4b5fd', bg:'#05030f', gradient:true, gradientStart:'#05030f', gradientEnd:'#120a2e', gradientDir:'to bottom right', font:'default',  buttonStyle:'pill'    },
  { id:'abyss',      name:'Abyss',     category:'Oscuro',   primary:'#38bdf8', secondary:'#0284c7', accent:'#7dd3fc', bg:'#020617', gradient:true, gradientStart:'#020617', gradientEnd:'#0a1a3a', gradientDir:'to bottom right', font:'mono',     buttonStyle:'square'  },
  { id:'carbon',     name:'Carbon',    category:'Oscuro',   primary:'#4ade80', secondary:'#22c55e', accent:'#bbf7d0', bg:'#050a06', gradient:true, gradientStart:'#050a06', gradientEnd:'#0d2010', gradientDir:'to bottom',       font:'default',  buttonStyle:'rounded' },
  { id:'amber-dark', name:'Amber',     category:'Oscuro',   primary:'#f59e0b', secondary:'#d97706', accent:'#fde68a', bg:'#0c0800', gradient:true, gradientStart:'#0c0800', gradientEnd:'#1f1200', gradientDir:'to bottom right', font:'default',  buttonStyle:'rounded' },
  { id:'scarlet',    name:'Scarlet',   category:'Oscuro',   primary:'#f43f5e', secondary:'#e11d48', accent:'#fda4af', bg:'#0c0108', gradient:true, gradientStart:'#0c0108', gradientEnd:'#1f0415', gradientDir:'to bottom right', font:'default',  buttonStyle:'pill'    },
  { id:'indigo-dark',name:'Indigo',    category:'Oscuro',   primary:'#6366f1', secondary:'#4f46e5', accent:'#a5b4fc', bg:'#05060f', gradient:true, gradientStart:'#05060f', gradientEnd:'#0f1035', gradientDir:'to bottom right', font:'mono',     buttonStyle:'square'  },
  { id:'pearl',      name:'Pearl',     category:'Claro',    primary:'#7c3aed', secondary:'#6d28d9', accent:'#8b5cf6', bg:'#fafafa', gradient:true, gradientStart:'#ffffff', gradientEnd:'#f5f3ff', gradientDir:'to bottom',       font:'default',  buttonStyle:'rounded' },
  { id:'breeze',     name:'Breeze',    category:'Claro',    primary:'#0369a1', secondary:'#075985', accent:'#38bdf8', bg:'#f0f9ff', gradient:true, gradientStart:'#f0f9ff', gradientEnd:'#e0f2fe', gradientDir:'to bottom',       font:'default',  buttonStyle:'rounded' },
  { id:'blossom',    name:'Blossom',   category:'Claro',    primary:'#db2777', secondary:'#9d174d', accent:'#f9a8d4', bg:'#fff1f2', gradient:true, gradientStart:'#fff1f2', gradientEnd:'#ffe4e6', gradientDir:'to bottom',       font:'rounded',  buttonStyle:'pill'    },
  { id:'meadow',     name:'Meadow',    category:'Claro',    primary:'#16a34a', secondary:'#15803d', accent:'#4ade80', bg:'#f0fdf4', gradient:true, gradientStart:'#f0fdf4', gradientEnd:'#dcfce7', gradientDir:'to bottom',       font:'rounded',  buttonStyle:'rounded' },
  { id:'cream',      name:'Cream',     category:'Claro',    primary:'#92400e', secondary:'#78350f', accent:'#f59e0b', bg:'#fffbeb', gradient:true, gradientStart:'#fffbeb', gradientEnd:'#fef3c7', gradientDir:'to bottom',       font:'serif',    buttonStyle:'soft'    },
  { id:'onyx',       name:'Onyx',      category:'Premium',  primary:'#d4af37', secondary:'#b8960c', accent:'#fef08a', bg:'#09090b', gradient:true, gradientStart:'#09090b', gradientEnd:'#161105', gradientDir:'to bottom right', font:'serif',    buttonStyle:'pill'    },
  { id:'velvet',     name:'Velvet',    category:'Premium',  primary:'#c026d3', secondary:'#a21caf', accent:'#e879f9', bg:'#09020f', gradient:true, gradientStart:'#09020f', gradientEnd:'#1e0530', gradientDir:'to bottom right', font:'serif',    buttonStyle:'pill'    },
  { id:'rouge',      name:'Rouge',     category:'Premium',  primary:'#fb7185', secondary:'#e11d48', accent:'#fecdd3', bg:'#0f0408', gradient:true, gradientStart:'#0f0408', gradientEnd:'#200818', gradientDir:'to bottom right', font:'serif',    buttonStyle:'pill'    },
  { id:'platinum',   name:'Platinum',  category:'Premium',  primary:'var(--text-muted)', secondary:'#64748b', accent:'var(--text-primary)', bg:'var(--bg-primary)', gradient:true, gradientStart:'var(--bg-primary)', gradientEnd:'#1e293b', gradientDir:'to bottom right', font:'serif',    buttonStyle:'soft'    },
  { id:'neo-tokyo',  name:'Neo Tokyo', category:'Vibrante', primary:'#22d3ee', secondary:'#0e7490', accent:'#f0abfc', bg:'#050010', gradient:true, gradientStart:'#050010', gradientEnd:'#001025', gradientDir:'to bottom right', font:'mono',     buttonStyle:'square'  },
  { id:'volcano',    name:'Volcano',   category:'Vibrante', primary:'#f97316', secondary:'#ea580c', accent:'#fde047', bg:'#0c0400', gradient:true, gradientStart:'#0c0400', gradientEnd:'#1f0a00', gradientDir:'to bottom right', font:'default',  buttonStyle:'rounded' },
  { id:'tropical',   name:'Tropical',  category:'Vibrante', primary:'#14b8a6', secondary:'#0d9488', accent:'#a3e635', bg:'#f0fdfa', gradient:true, gradientStart:'#f0fdfa', gradientEnd:'#ccfbf1', gradientDir:'to bottom',       font:'rounded',  buttonStyle:'pill'    },
  { id:'space',      name:'Space',     category:'Vibrante', primary:'#ec4899', secondary:'#db2777', accent:'#818cf8', bg:'#0a010f', gradient:true, gradientStart:'#0a010f', gradientEnd:'#1a0530', gradientDir:'to bottom right', font:'default',  buttonStyle:'pill'    },
  { id:'retro',      name:'Retro',     category:'Vibrante', primary:'#f97316', secondary:'#dc2626', accent:'#facc15', bg:'#fefce8', gradient:true, gradientStart:'#fffbeb', gradientEnd:'#fef9c3', gradientDir:'to bottom',       font:'serif',    buttonStyle:'soft'    },
]

const BUTTON_STYLE_MAP = { pill: '9999px', square: '0px', soft: '4px', rounded: '8px' }

const Settings = () => {
  const { user, updateProfile, requestPasswordChange, logout } = useAuth()
  const { settings, updateLanguage, toggleDarkMode } = useSettings()
  const { t } = useLanguage()
  const { showSuccess, showError } = useToastContext()
  const setConfig = useSetConfig()
  const config    = useConfig()

  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    const valid = ['profile', 'notifications', 'security', 'appearance', 'mystore', 'customization', 'modules', 'updates']
    return valid.includes(tab) ? tab : 'profile'
  })

  // ── Tab Perfil ──────────────────────────────
  const [profileData, setProfileData] = useState({
    first_name: '', last_name: '', email: user?.email || '', phone: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  // ── Tab Notificaciones ──────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    email_new_order:    true,
    email_order_status: true,
    email_new_user:     false,
    email_low_stock:    true,
    email_weekly_report: false
  })
  const [notifSaving, setNotifSaving] = useState(false)

  // ── Tab Seguridad ───────────────────────────
  const [passwordEmailSent, setPasswordEmailSent] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revokingId, setRevokingId] = useState(null)
  const [revokingAll, setRevokingAll] = useState(false)

  // ── Tab Apariencia ──────────────────────────
  const [langSaving, setLangSaving] = useState(false)

  // ── Tab Mi Tienda ───────────────────────────
  const [storeData, setStoreData] = useState({
    name: '', dashboard_name: '', description: '', currency: 'EUR', language: 'es',
    hero_title: '', hero_subtitle: '',
  })
  const [logoPreview,            setLogoPreview]            = useState(null)
  const [faviconPreview,         setFaviconPreview]         = useState(null)
  const [dashboardLogoPreview,   setDashboardLogoPreview]   = useState(null)
  const [dashboardFaviconPreview,setDashboardFaviconPreview]= useState(null)
  const [logoFile,            setLogoFile]            = useState(null)
  const [faviconFile,         setFaviconFile]         = useState(null)
  const [dashboardLogoFile,   setDashboardLogoFile]   = useState(null)
  const [dashboardFaviconFile,setDashboardFaviconFile]= useState(null)
  const [logoNewPreview,            setLogoNewPreview]            = useState(null)
  const [faviconNewPreview,         setFaviconNewPreview]         = useState(null)
  const [dashboardLogoNewPreview,   setDashboardLogoNewPreview]   = useState(null)
  const [dashboardFaviconNewPreview,setDashboardFaviconNewPreview]= useState(null)
  const [brandingData, setBrandingData] = useState({
    primary_color:   '#2563eb',
    secondary_color: '#4f46e5',
    accent_color:    '#06b6d4',
    bg_color:        '#ffffff',
  })
  const [designData, setDesignData] = useState({
    layout:        config?.design?.layout || 'classic',
    button_radius: '8px',
    font:          'default',
  })
  const [advancedData, setAdvancedData] = useState({
    gradient_enabled:     false,
    gradient_from:        '#4f46e5',
    gradient_to:          '#7c3aed',
    gradient_direction:   'to bottom',
    announcement_enabled: false,
    announcement_text:    '',
    announcement_color:   '#6366f1',
    custom_css:           '',
  })
  const [storeLoading, setStoreLoading] = useState(false)
  const [storeSaving,  setStoreSaving]  = useState(false)
  const [storeSubTab,  setStoreSubTab]  = useState('shop')
  const [showThemeModal,    setShowThemeModal]    = useState(false)
  const [themeCategory,     setThemeCategory]     = useState('Todos')
  const [hoveredTheme,      setHoveredTheme]      = useState(null)
  const [originalConfig,    setOriginalConfig]    = useState(null)
  const logoInputRef            = useRef(null)
  const faviconInputRef         = useRef(null)
  const dashboardLogoInputRef   = useRef(null)
  const dashboardFaviconInputRef= useRef(null)
  const iframeRef               = useRef(null)

  const [customizationText, setCustomizationText] = useState('')
  const [isSubmittingCustomization, setIsSubmittingCustomization] = useState(false)

  // ── Tab Actualizaciones (solo Electron) ─────
  const [appVersion,    setAppVersion]    = useState(null)
  const [updateStatus,  setUpdateStatus]  = useState('idle') // idle | checking | up-to-date | available | downloading | ready | error
  const [updateInfo,    setUpdateInfo]    = useState(null)
  const [dlProgress,    setDlProgress]    = useState(0)
  const [dlSpeed,       setDlSpeed]       = useState(0)
  const [dlTransferred, setDlTransferred] = useState(0)
  const [dlTotal,       setDlTotal]       = useState(0)
  const [updateError,   setUpdateError]   = useState(null)

  useEffect(() => {
    if (!window.electron?.isElectron) return
    window.electron.getAppVersion().then(v => setAppVersion(v))
    window.electron.getPendingUpdate().then(data => {
      if (data) { setUpdateInfo(data); setUpdateStatus('available') }
    })
    const c1 = window.electron.onUpdateAvailable((data) => {
      setUpdateInfo(data); setUpdateStatus('available'); setUpdateError(null)
    })
    const c2 = window.electron.onUpdateNotAvailable(() => {
      setUpdateStatus('up-to-date'); setUpdateError(null)
    })
    window.electron.onDownloadProgress((data) => {
      setUpdateStatus('downloading')
      setDlProgress(data.percent)
      setDlSpeed(data.bytesPerSecond || 0)
      setDlTransferred(data.transferred || 0)
      setDlTotal(data.total || 0)
    })
    window.electron.onUpdateDownloaded(() => {
      setUpdateStatus('ready'); setUpdateError(null)
    })
    window.electron.onUpdateError((msg) => {
      setUpdateStatus('error'); setUpdateError(msg)
    })
    return () => { c1?.(); c2?.() }
  }, [])

  const isCeo = user?.roles?.some(r => r.level >= 100)

  // ── Cargar datos al cambiar tab ─────────────
  useEffect(() => {
    if (activeTab === 'profile')       loadProfileData()
    if (activeTab === 'notifications') loadNotifPrefs()
    if (activeTab === 'security')      loadSessions()
    if (activeTab === 'mystore' && isCeo) loadStoreData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isCeo])

  const getToken = () =>
    localStorage.getItem('token') || sessionStorage.getItem('token')

  const loadProfileData = async () => {
    setProfileLoading(true)
    try {
      const res  = await fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await res.json()
      if (data.success) {
        const u = data.data.user
        setProfileData({
          first_name: u.firstName || '',
          last_name:  u.lastName  || '',
          email:      u.email     || '',
          phone:      u.phone     || ''
        })
      }
    } catch (e) { console.error('Error loading profile:', e) }
    finally { setProfileLoading(false) }
  }

  const loadNotifPrefs = async () => {
    try {
      const res  = await fetch('/api/auth/preferences', { headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await res.json()
      if (data.success && data.data.notifications) {
        setNotifPrefs(prev => ({ ...prev, ...data.data.notifications }))
      }
    } catch (e) { console.error('Error loading notif prefs:', e) }
  }

  const loadStoreData = async () => {
    setStoreLoading(true)
    try {
      const res  = await fetch('/api/store/me', { headers: { Authorization: `Bearer ${getToken()}` } })
      const data = await res.json()
      if (data.success) {
        const s        = data.data
        const branding = s.settings?.branding || {}
        setStoreData({
          name:           s.name                       || '',
          dashboard_name: branding.dashboard_name      || '',
          description:    branding.store_description   || '',
          currency:       s.settings?.currency         || 'EUR',
          language:       s.settings?.language         || 'es',
          hero_title:     branding.hero_title           || '',
          hero_subtitle:  branding.hero_subtitle        || '',
        })
        setLogoPreview(branding.logo_url              || null)
        setFaviconPreview(branding.favicon_url        || null)
        setDashboardLogoPreview(branding.dashboard_logo_url    || null)
        setDashboardFaviconPreview(branding.dashboard_favicon_url || null)
        setBrandingData({
          primary_color:   branding.primary_color   || '#2563eb',
          secondary_color: branding.secondary_color || '#4f46e5',
          accent_color:    branding.accent_color    || '#06b6d4',
          bg_color:        branding.bg_color        || '#ffffff',
        })
        const d = s.settings?.design || {}
        setDesignData({
          layout:        d.layout        || 'modern',
          button_radius: d.button_radius || '8px',
          font:          d.font          || 'default',
        })
        const ecd = s.settings?.enterprise_config?.design || {}
        setAdvancedData({
          gradient_enabled:     !!ecd.gradient_enabled,
          gradient_from:        ecd.gradient_from       || '#4f46e5',
          gradient_to:          ecd.gradient_to         || '#7c3aed',
          gradient_direction:   ecd.gradient_direction  || 'to bottom',
          announcement_enabled: !!ecd.announcement_enabled,
          announcement_text:    ecd.announcement_text   || '',
          announcement_color:   ecd.announcement_color  || '#6366f1',
          custom_css:           ecd.custom_css           || '',
        })
      }
    } catch (e) { console.error('Error loading store data:', e) }
    finally { setStoreLoading(false) }
  }

  // ── Handlers ────────────────────────────────
  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({ ...prev, [name]: value }))
  }

  const handleStoreDataChange = (e) => {
    const { name, value } = e.target
    setStoreData(prev => ({ ...prev, [name]: value }))
  }

  const handleColorChange = (field, value) => {
    setBrandingData(prev => ({ ...prev, [field]: value }))
  }

  const applyTheme = (theme) => {
    setBrandingData(prev => ({
      ...prev,
      primary_color:   theme.primary,
      secondary_color: theme.secondary,
      accent_color:    theme.accent,
      bg_color:        theme.bg,
    }))
    setDesignData(prev => ({
      ...prev,
      button_radius: BUTTON_STYLE_MAP[theme.buttonStyle] || '8px',
      font:          theme.font,
    }))
    setAdvancedData(prev => ({
      ...prev,
      gradient_enabled:   theme.gradient,
      gradient_from:      theme.gradientStart,
      gradient_to:        theme.gradientEnd,
      gradient_direction: theme.gradientDir,
    }))
    setShowThemeModal(false)
    setHoveredTheme(null)
    setOriginalConfig(null)
    showSuccess(`Tema "${theme.name}" aplicado — guarda para confirmar`)
  }

  const shopUrl = `${window.location.origin}/shop`

  const sendThemeToIframe = (theme) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage({
      type: 'SHOP_PREVIEW_UPDATE',
      payload: {
        colors: {
          primary:    theme.primary,
          secondary:  theme.secondary,
          accent:     theme.accent,
          background: theme.bg,
        },
        design: {
          layout:             theme.layout || designData.layout,
          button_radius:      BUTTON_STYLE_MAP[theme.buttonStyle] || '8px',
          font:               theme.font,
          gradient_enabled:   theme.gradient,
          gradient_from:      theme.gradientStart,
          gradient_to:        theme.gradientEnd,
          gradient_direction: theme.gradientDir,
        },
      },
    }, '*')
  }

  const openThemeModal = () => {
    setOriginalConfig({
      colors: { ...config?.colors },
      design: { ...config?.design },
    })
    setHoveredTheme(null)
    setThemeCategory('Todos')
    setShowThemeModal(true)
  }

  const closeThemeModal = () => {
    const iframe = iframeRef.current
    if (originalConfig && iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'SHOP_PREVIEW_UPDATE',
        payload: originalConfig,
      }, '*')
    }
    setShowThemeModal(false)
    setHoveredTheme(null)
    setOriginalConfig(null)
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    if (type === 'logo')             setLogoFile(file)
    else if (type === 'favicon')     setFaviconFile(file)
    else if (type === 'dashboard_logo')    setDashboardLogoFile(file)
    else                             setDashboardFaviconFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (type === 'logo')                  setLogoNewPreview(ev.target.result)
      else if (type === 'favicon')          setFaviconNewPreview(ev.target.result)
      else if (type === 'dashboard_logo')   setDashboardLogoNewPreview(ev.target.result)
      else                                  setDashboardFaviconNewPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const result = await updateProfile({
        firstName: profileData.first_name,
        lastName:  profileData.last_name,
        email:     profileData.email,
        phone:     profileData.phone
      })
      if (result.success) showSuccess('Perfil actualizado correctamente')
      else showError(result.message || 'Error al guardar el perfil')
    } catch (e) { showError('Error al guardar el perfil') }
    finally { setProfileSaving(false) }
  }

  const handleSaveNotifications = async () => {
    setNotifSaving(true)
    try {
      const res  = await fetch('/api/auth/preferences', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ notifications: notifPrefs })
      })
      const data = await res.json()
      if (data.success) showSuccess('Preferencias de notificaciones guardadas')
      else showError(data.message || 'Error al guardar')
    } catch (e) { showError('Error al guardar las notificaciones') }
    finally { setNotifSaving(false) }
  }

  const loadSessions = async () => {
    setSessionsLoading(true)
    try {
      const res  = await fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${getToken()}` }, credentials: 'include' })
      const data = await res.json()
      if (data.success) setSessions(data.data || [])
    } catch (e) { console.error('Error loading sessions:', e) }
    finally { setSessionsLoading(false) }
  }

  const revokeSession = async (sessionId) => {
    setRevokingId(sessionId)
    try {
      const res  = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) setSessions(prev => prev.filter(s => s.id !== sessionId))
      else showError(data.message || 'Error al cerrar sesión')
    } catch (e) { showError('Error al cerrar sesión') }
    finally { setRevokingId(null) }
  }

  const revokeAllOtherSessions = async () => {
    setRevokingAll(true)
    try {
      const res  = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include'
      })
      const data = await res.json()
      if (data.success) { setSessions(prev => prev.filter(s => s.is_current)); showSuccess('Otras sesiones cerradas') }
      else showError(data.message || 'Error')
    } catch (e) { showError('Error al cerrar sesiones') }
    finally { setRevokingAll(false) }
  }

  const handleRequestPasswordChange = async () => {
    setPasswordLoading(true)
    try {
      const result = await requestPasswordChange()
      if (result.success) { setPasswordEmailSent(true); showSuccess('Enlace de cambio enviado a tu email') }
      else showError(result.message || 'No se pudo enviar el email')
    } catch (e) { showError('No se pudo enviar el email. Inténtalo de nuevo.') }
    finally { setPasswordLoading(false) }
  }

  const handleSaveLanguage = async () => {
    setLangSaving(true)
    try {
      const res  = await fetch('/api/auth/preferences', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ language: settings.language })
      })
      const data = await res.json()
      if (data.success) showSuccess('Idioma guardado correctamente')
      else showError(data.message || 'Error al guardar')
    } catch (e) { showError('Error al guardar el idioma') }
    finally { setLangSaving(false) }
  }

  const handleStoreSave = async () => {
    setStoreSaving(true)
    try {
      const fd = new FormData()
      fd.append('name',           storeData.name)
      fd.append('dashboard_name', storeData.dashboard_name)
      fd.append('description',    storeData.description)
      fd.append('currency',       storeData.currency)
      fd.append('language',       storeData.language)
      fd.append('hero_title',     storeData.hero_title)
      fd.append('hero_subtitle',  storeData.hero_subtitle)
      if (logoFile)            fd.append('logo',             logoFile)
      if (faviconFile)         fd.append('favicon',          faviconFile)
      if (dashboardLogoFile)   fd.append('dashboard_logo',   dashboardLogoFile)
      if (dashboardFaviconFile)fd.append('dashboard_favicon',dashboardFaviconFile)
      fd.append('primary_color',    brandingData.primary_color)
      fd.append('secondary_color',  brandingData.secondary_color)
      fd.append('accent_color',     brandingData.accent_color)
      fd.append('bg_color',         brandingData.bg_color)
      fd.append('design_layout',        designData.layout)
      fd.append('design_button_radius', designData.button_radius)
      fd.append('design_font',          designData.font)
      fd.append('gradient_enabled',     String(advancedData.gradient_enabled))
      fd.append('gradient_from',        advancedData.gradient_from)
      fd.append('gradient_to',          advancedData.gradient_to)
      fd.append('gradient_direction',   advancedData.gradient_direction)
      fd.append('announcement_enabled', String(advancedData.announcement_enabled))
      fd.append('announcement_text',    advancedData.announcement_text)
      fd.append('announcement_color',   advancedData.announcement_color)
      fd.append('custom_css',           advancedData.custom_css)

      const res  = await fetch('/api/store/me', {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    fd
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Error al guardar')
      showSuccess('Configuración guardada correctamente')
      setLogoFile(null); setFaviconFile(null)
      setDashboardLogoFile(null); setDashboardFaviconFile(null)
      setLogoNewPreview(null); setFaviconNewPreview(null)
      setDashboardLogoNewPreview(null); setDashboardFaviconNewPreview(null)
      const tenantRes  = await fetch('/api/public/tenant-check')
      const tenantData = await tenantRes.json()
      if (tenantData.success && tenantData.tenant) setConfig(buildConfig(tenantData.tenant))
    } catch (e) {
      console.error('Error saving store:', e)
      showError(e.message || 'Error al guardar los cambios')
    } finally { setStoreSaving(false) }
  }

  const handleSave = async () => {
    if (activeTab === 'profile')       { await handleSaveProfile();       return }
    if (activeTab === 'notifications') { await handleSaveNotifications(); return }
    if (activeTab === 'appearance')    { await handleSaveLanguage();      return }
    if (activeTab === 'mystore')       { await handleStoreSave();         return }
  }

  const handleCustomizationSubmit = async (e) => {
    e.preventDefault()
    if (!customizationText.trim()) return
    setIsSubmittingCustomization(true)
    try {
      showSuccess('Solicitud enviada al equipo técnico. Te contactaremos pronto.')
      setCustomizationText('')
    } catch (error) { console.error('Error:', error) }
    finally { setIsSubmittingCustomization(false) }
  }

  // ── Tabs principales ─────────────────────────
  const tabs = [
    { id: 'profile',       label: t('profile'),       icon: User    },
    { id: 'notifications', label: t('notifications'), icon: Bell    },
    { id: 'security',      label: t('security'),      icon: Shield  },
    { id: 'appearance',    label: t('appearance'),    icon: Palette },
    ...(isCeo ? [{ id: 'mystore', label: 'Mi Tienda', icon: Store }] : []),
    ...(user?.roles?.some(r => r.name === 'ceo') && user?.preferences?.plan_id === 'enterprise'
      ? [{ id: 'customization', label: 'Personalización a Medida', icon: Globe }] : []),
    ...(isCeo ? [{ id: 'modules', label: 'Módulos', icon: LayoutGrid }] : []),
    ...(window.electron?.isElectron ? [{ id: 'updates', label: 'Actualizaciones', icon: Download }] : []),
  ]

  const inputCls = 'w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-300 mb-2'
  const isSmallType = (tp) => tp === 'favicon' || tp === 'dashboard_favicon'

  // ── ImageUploadField ─────────────────────────
  const ImageUploadField = ({ type, label, currentUrl, newPreview, inputRef }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {newPreview ? (
            <img src={newPreview} alt="preview"
              className={isSmallType(type) ? 'w-10 h-10 object-contain rounded border border-gray-600' : 'h-12 max-w-[120px] object-contain rounded border border-gray-600'} />
          ) : currentUrl ? (
            <img src={currentUrl} alt="actual"
              className={isSmallType(type) ? 'w-10 h-10 object-contain rounded border border-gray-600' : 'h-12 max-w-[120px] object-contain rounded border border-gray-600'} />
          ) : (
            <div className={`${isSmallType(type) ? 'w-10 h-10' : 'w-20 h-12'} rounded border border-dashed border-gray-600 flex items-center justify-center`}>
              <span className="text-gray-500 text-xs">—</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFileChange(e, type)} />
          <button type="button" onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors">
            {newPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </button>
          <p className="text-xs text-gray-500 mt-1">Se convertirá automáticamente a WebP</p>
        </div>
      </div>
    </div>
  )

  // ── Toggle helper ────────────────────────────
  const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
    </label>
  )

  // ── Render tab content ────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {

      // ── PERFIL ──────────────────────────────
      case 'profile':
        if (profileLoading) return (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
          </div>
        )
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>{t('firstName')}</label>
                <input type="text" name="first_name" value={profileData.first_name}
                  onChange={handleProfileChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('lastName')}</label>
                <input type="text" name="last_name" value={profileData.last_name}
                  onChange={handleProfileChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('email')}</label>
                <input type="email" name="email" value={profileData.email}
                  onChange={handleProfileChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('phone')}</label>
                <input type="tel" name="phone" value={profileData.phone}
                  onChange={handleProfileChange} className={inputCls} placeholder="+34 600 000 000" />
              </div>
            </div>
          </div>
        )

      // ── NOTIFICACIONES ───────────────────────
      case 'notifications':
        return (
          <div className="space-y-5">
            {[
              { key: 'email_new_order',    titleKey: 'notifNewOrder',    descKey: 'notifNewOrderDesc' },
              { key: 'email_order_status', titleKey: 'notifOrderStatus', descKey: 'notifOrderStatusDesc' },
              { key: 'email_new_user',     titleKey: 'notifNewUser',     descKey: 'notifNewUserDesc' },
              { key: 'email_low_stock',    titleKey: 'notifLowStock',    descKey: 'notifLowStockDesc' },
              { key: 'email_weekly_report',titleKey: 'notifWeeklyReport',descKey: 'notifWeeklyReportDesc' },
            ].map(({ key, titleKey, descKey }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-700/40 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-200">{t(titleKey)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t(descKey)}</p>
                </div>
                <Toggle
                  checked={notifPrefs[key]}
                  onChange={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                />
              </div>
            ))}
          </div>
        )

      // ── SEGURIDAD ────────────────────────────
      case 'security': {
        const DeviceIcon = ({ name }) => {
          if (!name) return <Monitor className="w-5 h-5 text-gray-400" />
          const n = name.toLowerCase()
          if (n === 'móvil' || n === 'mobile') return <Smartphone className="w-5 h-5 text-blue-400" />
          if (n === 'tablet') return <Tablet className="w-5 h-5 text-purple-400" />
          return <Monitor className="w-5 h-5 text-gray-400" />
        }
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

        return (
          <div className="space-y-8">
            {/* Sesiones activas */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-200">Sesiones activas</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Dispositivos donde has iniciado sesión</p>
                </div>
                {sessions.filter(s => !s.is_current).length > 0 && (
                  <button onClick={revokeAllOtherSessions} disabled={revokingAll}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    <LogOut className="w-3 h-3" />
                    {revokingAll ? 'Cerrando...' : 'Cerrar otras sesiones'}
                  </button>
                )}
              </div>

              {sessionsLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" /></div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No hay sesiones activas</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${s.is_current ? 'bg-green-500/5 border-green-500/20' : 'bg-gray-700/20 border-gray-700/40'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0">
                          <DeviceIcon name={s.device_name} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {s.browser || 'Navegador'}{s.os ? ` · ${s.os}` : ''}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {s.ip_address && `${s.ip_address} · `}
                            {s.is_current ? 'Este dispositivo' : `Último acceso: ${fmtDate(s.last_active)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {s.is_current ? (
                          <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <button onClick={() => revokeSession(s.id)} disabled={revokingId === s.id}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cambiar contraseña */}
            <div className="border-t border-gray-700/40 pt-6">
              <h3 className="text-base font-semibold text-gray-200 mb-2">{t('changePassword')}</h3>
              <p className="text-sm text-gray-400 mb-4">Recibirás un enlace en tu email para establecer una nueva contraseña de forma segura.</p>
              {passwordEmailSent ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Shield className="w-4 h-4" />
                  Enlace enviado a <span className="font-medium">{user?.email}</span>.
                </div>
              ) : (
                <button onClick={handleRequestPasswordChange} disabled={passwordLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm">
                  {passwordLoading ? 'Enviando...' : 'Cambiar contraseña'}
                </button>
              )}
            </div>
          </div>
        )
      }

      // ── APARIENCIA ───────────────────────────
      case 'appearance':
        return (
          <div className="space-y-6">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-primary)',
              cursor: 'pointer'
            }} onClick={toggleDarkMode}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {settings.darkMode
                  ? <Moon size={20} color="var(--text-muted)" />
                  : <Sun size={20} color="#f59e0b" />
                }
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: 0, fontSize: '14px' }}>
                    {settings.darkMode ? 'Modo oscuro' : 'Modo claro'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                    {settings.darkMode ? 'Click para activar modo claro' : 'Click para activar modo oscuro'}
                  </p>
                </div>
              </div>
              <div style={{
                width: '44px',
                height: '24px',
                borderRadius: '9999px',
                background: settings.darkMode ? 'var(--bg-tertiary)' : '#6366f1',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: settings.darkMode ? '2px' : '22px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>
          </div>
        )

      // ── MI TIENDA ────────────────────────────
      case 'mystore':
        if (storeLoading) return (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
          </div>
        )
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-400" />
              Configuración de la tienda
            </h3>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-gray-700/50 pb-0">
              {[
                { id: 'shop',      label: 'Shop',      emoji: '🛍️' },
                { id: 'dashboard', label: 'Dashboard', emoji: '⚙️' },
              ].map(st => (
                <button key={st.id} type="button" onClick={() => setStoreSubTab(st.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                    storeSubTab === st.id
                      ? 'border-blue-400 text-blue-400 bg-blue-400/5'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                  }`}>
                  {st.emoji} {st.label}
                </button>
              ))}
            </div>

            {/* ── SHOP sub-tab ── */}
            {storeSubTab === 'shop' && (
              <div className="space-y-10">

                {/* SECCIÓN 1 — Información básica (todos los planes) */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-700/30">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Información básica</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Nombre de la tienda</label>
                      <input type="text" name="name" value={storeData.name}
                        onChange={handleStoreDataChange} className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Descripción</label>
                      <textarea name="description" value={storeData.description}
                        onChange={handleStoreDataChange} rows={3}
                        className={`${inputCls} resize-none`} placeholder="Describe tu tienda..." />
                    </div>
                    {(designData.layout === 'modern' || config?.design?.layout === 'modern') && (
                      <>
                        <div>
                          <label className={labelCls}>Título del hero</label>
                          <input type="text" name="hero_title" value={storeData.hero_title}
                            onChange={handleStoreDataChange} className={inputCls}
                            placeholder="Descubre nuestra colección" />
                          <p className="text-xs text-gray-500 mt-1">La última palabra se resaltará con tu color primario</p>
                        </div>
                        <div>
                          <label className={labelCls}>Subtítulo del hero</label>
                          <input type="text" name="hero_subtitle" value={storeData.hero_subtitle}
                            onChange={handleStoreDataChange} className={inputCls}
                            placeholder="Usa la descripción de la tienda si vacío" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className={labelCls}>Moneda</label>
                      <select name="currency" value={storeData.currency}
                        onChange={handleStoreDataChange} className={inputCls}>
                        <option value="EUR">EUR — Euro</option>
                        <option value="USD">USD — Dólar</option>
                        <option value="GBP">GBP — Libra</option>
                        <option value="MXN">MXN — Peso Mexicano</option>
                        <option value="COP">COP — Peso Colombiano</option>
                        <option value="ARS">ARS — Peso Argentino</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Idioma</label>
                      <select name="language" value={storeData.language}
                        onChange={handleStoreDataChange} className={inputCls}>
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <ImageUploadField type="logo" label="Logo de la tienda"
                        currentUrl={logoPreview} newPreview={logoNewPreview} inputRef={logoInputRef} />
                    </div>
                    <div>
                      <ImageUploadField type="favicon" label="Favicon (64×64)"
                        currentUrl={faviconPreview} newPreview={faviconNewPreview} inputRef={faviconInputRef} />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2 — Apariencia (Profesional + Premium) */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-700/30">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Apariencia</span>
                    {config?.plan === 'starter' && (
                      <span className="ml-auto text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full px-2 py-0.5">Plan Profesional</span>
                    )}
                  </div>

                  {config?.plan === 'starter' ? (
                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', marginBottom: '8px' }}>🎨</p>
                      <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '8px' }}>Personaliza tu tienda</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Cambia colores, layout y tipografía con el plan Profesional</p>
                      <a href="https://neonhub.es/precios" target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', padding: '10px 24px', background: '#6366f1', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
                        Ver planes →
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-8">

                      {/* Layout selector */}
                      <div>
                        <label className={labelCls}>Layout de la tienda</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                          {[
                            { id: 'classic', label: 'Clásico' },
                            { id: 'modern',  label: 'Moderno' },
                            { id: 'minimal', label: 'Minimalista' },
                          ].map(({ id, label }) => (
                            <div key={id} onClick={() => setDesignData(prev => ({ ...prev, layout: id }))}
                              style={{
                                border: `2px solid ${designData.layout === id ? (brandingData.primary_color || '#6366f1') : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '8px', padding: '12px', cursor: 'pointer', textAlign: 'center',
                                transition: 'border-color 0.2s',
                                background: designData.layout === id ? 'rgba(99,102,241,0.06)' : 'transparent',
                              }}>
                              <div style={{ height: '60px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
                                {id === 'classic' && (
                                  <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px', height: '100%' }}>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', width: '60%' }} />
                                    <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                                      <div style={{ width: '28%', background: 'rgba(99,102,241,0.3)', borderRadius: '2px' }} />
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '2px' }}>
                                        {[1,2,3].map(i => <div key={i} style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', width: `${90-i*15}%` }} />)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {id === 'modern' && (
                                  <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px', height: '100%' }}>
                                    <div style={{ height: '10px', background: 'rgba(99,102,241,0.4)', borderRadius: '2px' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px', flex: 1 }}>
                                      {[0,1,2].map(i => <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />)}
                                    </div>
                                  </div>
                                )}
                                {id === 'minimal' && (
                                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', width: '50%' }} />
                                    <div style={{ height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', width: '80%', border: '1px solid var(--border-primary)' }} />
                                    <div style={{ height: '5px', background: 'rgba(99,102,241,0.4)', borderRadius: '3px', width: '35%' }} />
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', color: designData.layout === id ? '#a5b4fc' : 'var(--text-muted)', fontWeight: designData.layout === id ? 600 : 400 }}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Selector de temas */}
                      <div>
                        <button onClick={openThemeModal}
                          style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:600, fontSize:'15px', marginBottom:'0', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                          🎨 Explorar temas predefinidos
                        </button>
                      </div>

                      {/* Colores */}
                      <div>
                        <label className={labelCls}>Colores de la tienda</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { field: 'primary_color',   label: 'Color primario' },
                            { field: 'secondary_color', label: 'Color secundario' },
                            { field: 'accent_color',    label: 'Color de acento' },
                            { field: 'bg_color',        label: 'Color de fondo' },
                          ].map(({ field, label }) => (
                            <div key={field} className="flex items-center gap-3">
                              <input type="color" value={brandingData[field]}
                                onChange={e => handleColorChange(field, e.target.value)}
                                className="w-9 h-9 rounded-lg cursor-pointer flex-shrink-0"
                                style={{ padding: '2px', border: 'none', background: 'transparent' }}
                              />
                              <div className="flex-1">
                                <p className="text-xs text-gray-400 mb-1">{label}</p>
                                <input type="text" value={brandingData[field]}
                                  onChange={e => handleColorChange(field, e.target.value)}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white font-mono focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Preview en tiempo real */}
                        <div style={{ background: brandingData.bg_color, borderRadius: '8px', padding: '16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', border: '1px solid var(--border-primary)' }}>
                          <button style={{ background: brandingData.primary_color, color: '#fff', padding: '8px 20px', borderRadius: designData.button_radius, border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'default' }}>
                            Añadir al carrito
                          </button>
                          <span style={{ color: brandingData.primary_color, fontWeight: 700, fontSize: '18px' }}>€99.99</span>
                          <span style={{ color: brandingData.accent_color, fontSize: '13px' }}>✓ En stock</span>
                        </div>
                      </div>

                      {/* Estilo de botones */}
                      <div>
                        <label className={labelCls}>Estilo de botones</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                          {[
                            { id: '8px',    label: 'Redondeado' },
                            { id: '9999px', label: 'Píldora' },
                            { id: '0px',    label: 'Cuadrado' },
                            { id: '4px',    label: 'Suave' },
                          ].map(({ id, label }) => (
                            <div key={id} onClick={() => setDesignData(prev => ({ ...prev, button_radius: id }))}
                              style={{
                                border: `2px solid ${designData.button_radius === id ? (brandingData.primary_color || '#6366f1') : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '8px', padding: '12px 6px', cursor: 'pointer', textAlign: 'center',
                                background: designData.button_radius === id ? 'rgba(99,102,241,0.06)' : 'transparent',
                                transition: 'border-color 0.15s',
                              }}>
                              <button style={{ background: brandingData.primary_color || '#6366f1', color: '#fff', padding: '5px 8px', borderRadius: id, border: 'none', fontSize: '10px', fontWeight: 600, marginBottom: '6px', cursor: 'default', width: '100%' }}>
                                Comprar
                              </button>
                              <span style={{ fontSize: '10px', color: designData.button_radius === id ? '#a5b4fc' : 'var(--text-muted)' }}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tipografía */}
                      <div>
                        <label className={labelCls}>Tipografía</label>
                        <select value={designData.font}
                          onChange={e => setDesignData(prev => ({ ...prev, font: e.target.value }))}
                          className={inputCls}
                          style={{ fontFamily: designData.font === 'serif' ? 'Georgia,serif' : designData.font === 'mono' ? 'monospace' : designData.font === 'rounded' ? 'Nunito,sans-serif' : 'system-ui' }}>
                          <option value="default" style={{ fontFamily: 'system-ui' }}>Default — Sistema</option>
                          <option value="serif"   style={{ fontFamily: 'Georgia,serif' }}>Serif — Georgia</option>
                          <option value="mono"    style={{ fontFamily: 'monospace' }}>Mono — Monospace</option>
                          <option value="rounded" style={{ fontFamily: 'Nunito,sans-serif' }}>Rounded — Nunito</option>
                        </select>
                      </div>

                    </div>
                  )}
                </div>

                {/* SECCIÓN 3 — Personalización avanzada (solo Premium) */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-700/30">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Personalización avanzada</span>
                    {config?.plan !== 'enterprise' && (
                      <span className="ml-auto text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2 py-0.5">Plan Premium</span>
                    )}
                  </div>

                  {config?.plan !== 'enterprise' ? (
                    <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', marginBottom: '8px' }}>✨</p>
                      <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '8px' }}>Personalización sin límites</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Gradientes, banners de anuncio y CSS personalizado con el plan Premium</p>
                      <a href="https://neonhub.es/precios" target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', padding: '10px 24px', background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
                        Ver planes →
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-5">

                      {/* Gradiente de fondo */}
                      <div className="p-4 rounded-xl border border-gray-700/40 bg-gray-800/20">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-200">Gradiente de fondo</p>
                            <p className="text-xs text-gray-500 mt-0.5">Aplica un gradiente al fondo de la tienda</p>
                          </div>
                          <Toggle checked={advancedData.gradient_enabled}
                            onChange={() => setAdvancedData(prev => ({ ...prev, gradient_enabled: !prev.gradient_enabled }))} />
                        </div>
                        {advancedData.gradient_enabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-700/30">
                            {[
                              { field: 'gradient_from', label: 'Color inicio' },
                              { field: 'gradient_to',   label: 'Color fin' },
                            ].map(({ field, label }) => (
                              <div key={field} className="flex items-center gap-2">
                                <input type="color" value={advancedData[field]}
                                  onChange={e => setAdvancedData(prev => ({ ...prev, [field]: e.target.value }))}
                                  className="w-9 h-9 rounded cursor-pointer flex-shrink-0"
                                  style={{ padding: '2px', border: 'none', background: 'transparent' }} />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                                  <input type="text" value={advancedData[field]}
                                    onChange={e => setAdvancedData(prev => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white font-mono focus:ring-1 focus:ring-blue-400 focus:border-transparent" />
                                </div>
                              </div>
                            ))}
                            <div>
                              <label className={labelCls}>Dirección</label>
                              <select value={advancedData.gradient_direction}
                                onChange={e => setAdvancedData(prev => ({ ...prev, gradient_direction: e.target.value }))}
                                className={inputCls}>
                                <option value="to bottom">↓ Hacia abajo</option>
                                <option value="to bottom right">↘ Diagonal</option>
                                <option value="to right">→ Horizontal</option>
                                <option value="135deg">↗ Diagonal inversa</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Banner de anuncio */}
                      <div className="p-4 rounded-xl border border-gray-700/40 bg-gray-800/20">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-200">Banner de anuncio</p>
                            <p className="text-xs text-gray-500 mt-0.5">Muestra un banner en la parte superior de tu tienda</p>
                          </div>
                          <Toggle checked={advancedData.announcement_enabled}
                            onChange={() => setAdvancedData(prev => ({ ...prev, announcement_enabled: !prev.announcement_enabled }))} />
                        </div>
                        {advancedData.announcement_enabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-700/30">
                            <div className="sm:col-span-2">
                              <label className={labelCls}>Texto del banner</label>
                              <input type="text" value={advancedData.announcement_text}
                                onChange={e => setAdvancedData(prev => ({ ...prev, announcement_text: e.target.value }))}
                                className={inputCls} placeholder="¡Envío gratis en pedidos +50€!" maxLength={120} />
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="color" value={advancedData.announcement_color}
                                onChange={e => setAdvancedData(prev => ({ ...prev, announcement_color: e.target.value }))}
                                className="w-9 h-9 rounded cursor-pointer flex-shrink-0"
                                style={{ padding: '2px', border: 'none', background: 'transparent' }} />
                              <div className="flex-1">
                                <p className="text-xs text-gray-400 mb-1">Color del banner</p>
                                <input type="text" value={advancedData.announcement_color}
                                  onChange={e => setAdvancedData(prev => ({ ...prev, announcement_color: e.target.value }))}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white font-mono focus:ring-1 focus:ring-blue-400 focus:border-transparent" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CSS personalizado */}
                      <div>
                        <label className={labelCls}>CSS personalizado</label>
                        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2.5 mb-2">
                          <span className="text-amber-400 text-xs mt-0.5">⚠</span>
                          <p className="text-xs text-amber-300/80">El CSS se aplica directamente a tu tienda. Úsalo con cuidado.</p>
                        </div>
                        <textarea value={advancedData.custom_css}
                          onChange={e => setAdvancedData(prev => ({ ...prev, custom_css: e.target.value }))}
                          rows={6}
                          placeholder={'/* Tu CSS personalizado */\n.product-card { border-radius: 16px; }'}
                          className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600 rounded-lg text-white text-xs font-mono focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                        />
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── DASHBOARD sub-tab ── */}
            {storeSubTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelCls}>Nombre del dashboard</label>
                  <input type="text" name="dashboard_name" value={storeData.dashboard_name}
                    onChange={handleStoreDataChange} className={inputCls}
                    placeholder="Ej: Mi Panel, RestaurantLee Admin..." />
                  <p className="text-xs text-gray-500 mt-1">Aparece en el header del panel de administración</p>
                </div>
                <div>
                  <ImageUploadField type="dashboard_logo" label="Logo del dashboard (sidebar)"
                    currentUrl={dashboardLogoPreview} newPreview={dashboardLogoNewPreview} inputRef={dashboardLogoInputRef} />
                </div>
                <div>
                  <ImageUploadField type="dashboard_favicon" label="Favicon del dashboard (pestaña navegador)"
                    currentUrl={dashboardFaviconPreview} newPreview={dashboardFaviconNewPreview} inputRef={dashboardFaviconInputRef} />
                </div>
              </div>
            )}
          </div>
        )

      // ── PERSONALIZACIÓN ──────────────────────
      case 'customization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-amber-500 mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Personalización a Medida (Plan Enterprise)
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Envía a nuestro equipo técnico de NeonHub tus requerimientos de desarrollo.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-6">
                <form onSubmit={handleCustomizationSubmit}>
                  <label className="block text-sm font-medium text-amber-200 mb-2">Describe tus necesidades</label>
                  <textarea rows={5} placeholder="Ej: Necesitamos conectar el stock con nuestro ERP Navision..."
                    value={customizationText} onChange={(e) => setCustomizationText(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 resize-none mb-4" />
                  <button type="submit" disabled={isSubmittingCustomization || !customizationText.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg transition-all font-medium disabled:opacity-50">
                    {isSubmittingCustomization ? 'Enviando...' : 'Enviar Solicitud al Equipo Técnico'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )

      case 'modules':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-violet-400" />
                Módulos de tu tienda
              </h2>
              <p className="text-gray-400 text-sm mt-1">Activa o desactiva las funcionalidades disponibles en tu plan.</p>
            </div>
            <Modules />
          </div>
        )

      // ── ACTUALIZACIONES (solo Electron) ─────
      case 'updates':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-400" />
                Actualizaciones de NeonHub
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Comprueba si hay nuevas versiones disponibles e instálalas sin salir del escritorio.
              </p>
            </div>

            {/* Versión actual */}
            <div className="bg-gray-700/30 border border-gray-600/40 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Versión instalada</p>
                <p className="text-2xl font-bold text-white">v{appVersion || '—'}</p>
              </div>
              {updateStatus === 'up-to-date' && (
                <span className="flex items-center gap-2 text-sm font-semibold text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                  ✅ Actualizado
                </span>
              )}
              {updateStatus === 'available' && (
                <span className="flex items-center gap-2 text-sm font-semibold text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20">
                  🆕 v{updateInfo?.version} disponible
                </span>
              )}
              {updateStatus === 'ready' && (
                <span className="flex items-center gap-2 text-sm font-semibold text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-full border border-purple-400/20">
                  ⬇️ Lista para instalar
                </span>
              )}
              {updateStatus === 'error' && (
                <span className="flex items-center gap-2 text-sm font-semibold text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                  ❌ Error al comprobar
                </span>
              )}
            </div>

            {/* Estado y acciones */}
            <div className="space-y-4">
              {updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error' ? (
                <div className="space-y-3">
                  {updateStatus === 'error' && updateError && (
                    <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{updateError}</p>
                  )}
                  <button
                    onClick={() => { setUpdateStatus('checking'); setUpdateError(null); window.electron.checkForUpdates() }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Buscar actualizaciones
                  </button>
                </div>
              ) : updateStatus === 'checking' ? (
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  Buscando actualizaciones...
                </div>
              ) : updateStatus === 'available' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">
                    NeonHub <span className="font-semibold text-blue-400">v{updateInfo?.version}</span> está disponible.
                  </p>
                  <button
                    onClick={() => { setUpdateStatus('downloading'); window.electron.downloadUpdate() }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Descargar e instalar
                  </button>
                </div>
              ) : updateStatus === 'downloading' ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Descargando… {dlProgress}%</span>
                    {dlSpeed > 0 && (
                      <span className="text-gray-500">{(dlSpeed / 1024 / 1024).toFixed(1)} MB/s</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${dlProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                    />
                  </div>
                  {dlTotal > 0 && (
                    <p className="text-xs text-gray-500 text-right">
                      {(dlTransferred / 1024 / 1024).toFixed(1)} / {(dlTotal / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
              ) : updateStatus === 'ready' ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300">
                    La actualización está lista. Se instalará al reiniciar NeonHub.
                  </p>
                  <button
                    onClick={() => window.electron.installUpdate()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    Reiniciar e instalar ahora
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )

      default: return null
    }
  }

  const showSaveButton = !['customization', 'security', 'appearance', 'modules', 'updates'].includes(activeTab)
  const isSaving = profileSaving || notifSaving || storeSaving || langSaving

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('settingsTitle')}</h1>
        <p className="text-gray-400">{t('settingsDescription')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${activeTab === tab.id ? 'bg-blue-400/20 text-blue-400' : 'text-gray-300 hover:bg-gray-700/20'}`}>
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            {renderTabContent()}
            {showSaveButton && (
              <div className="mt-8 pt-6 border-t border-gray-700/30">
                <button onClick={handleSave} disabled={isSaving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center disabled:opacity-50">
                  <Save className="w-5 h-5 mr-2" />
                  {isSaving ? 'Guardando...' : t('saveChanges')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── MODAL SELECTOR DE TEMAS ── */}
      {showThemeModal && (() => {
        const filtered = themeCategory === 'Todos'
          ? PRESET_THEMES
          : PRESET_THEMES.filter(t => t.category === themeCategory)
        const preview = hoveredTheme
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:1000, display:'flex' }}
            onClick={e => { if (e.target === e.currentTarget) closeThemeModal() }}>

            {/* Columna izquierda — selector */}
            <div style={{ width:'400px', background:'var(--bg-primary)', overflowY:'auto', padding:'24px', borderRight:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <h2 style={{ color:'#fff', margin:0, fontSize:'20px', fontWeight:700 }}>Elige un tema</h2>
                <button onClick={closeThemeModal}
                  style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'var(--text-muted)', borderRadius:'6px', padding:'6px 10px', cursor:'pointer', fontSize:'16px', lineHeight:1 }}>
                  ✕
                </button>
              </div>

              {/* Tabs de categoría */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'20px' }}>
                {['Todos','Oscuro','Claro','Premium','Vibrante'].map(cat => (
                  <button key={cat} onClick={() => setThemeCategory(cat)}
                    style={{ padding:'5px 14px', borderRadius:'20px', background: themeCategory === cat ? '#6366f1' : 'rgba(255,255,255,0.06)', color:'#fff', border:'none', cursor:'pointer', fontSize:'12px', fontWeight: themeCategory === cat ? 600 : 400, transition:'background 0.15s' }}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid 2 columnas */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {filtered.map(theme => (
                  <div key={theme.id}
                    onClick={() => { setHoveredTheme(theme); sendThemeToIframe(theme) }}
                    onDoubleClick={() => applyTheme(theme)}
                    title={`Doble click para aplicar "${theme.name}"`}
                    style={{
                      background: theme.bg,
                      border: `2px solid ${hoveredTheme?.id === theme.id ? theme.primary : 'transparent'}`,
                      borderRadius:'10px', padding:'12px', cursor:'pointer',
                      transition:'border-color 0.15s',
                      boxShadow: hoveredTheme?.id === theme.id ? `0 0 0 1px ${theme.primary}40` : 'none',
                    }}>
                    <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
                      {[theme.primary, theme.secondary, theme.accent, theme.bg].map((c, i) => (
                        <div key={i} style={{ width:'16px', height:'16px', borderRadius:'50%', background:c, border:'1px solid rgba(255,255,255,0.15)', flexShrink:0 }} />
                      ))}
                    </div>
                    <p style={{ color: theme.primary, margin:0, fontSize:'12px', fontWeight:700, lineHeight:1.3 }}>{theme.name}</p>
                    <p style={{ color:'rgba(255,255,255,0.35)', margin:'2px 0 0', fontSize:'10px' }}>{theme.category}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna derecha — iframe preview */}
            <div style={{ flex:1, background:'var(--bg-primary)', display:'flex', flexDirection:'column', minWidth:0 }}>
              {/* Header */}
              <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                <span style={{ color:'var(--text-muted)', fontSize:'14px' }}>
                  {preview ? `Preview — ${preview.name}` : 'Haz click en un tema para previsualizar'}
                </span>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={closeThemeModal}
                    style={{ padding:'8px 18px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'var(--text-primary)', cursor:'pointer', fontSize:'13px' }}>
                    Cancelar
                  </button>
                  <button onClick={() => preview && applyTheme(preview)} disabled={!preview}
                    style={{ padding:'8px 18px', borderRadius:'8px', border:'none', background: preview ? '#6366f1' : '#374151', color:'#fff', cursor: preview ? 'pointer' : 'not-allowed', fontWeight:600, fontSize:'13px', transition:'background 0.15s' }}>
                    Aplicar tema
                  </button>
                </div>
              </div>

              {/* Iframe */}
              <div style={{ flex:1, padding:'16px', overflow:'hidden' }}>
                <div style={{ width:'100%', height:'100%', borderRadius:'12px', overflow:'hidden', border:'1px solid var(--border-primary)' }}>
                  <iframe
                    ref={iframeRef}
                    src={shopUrl}
                    style={{ width:'100%', height:'100%', border:'none', borderRadius:'12px' }}
                    title="Preview de la tienda"
                  />
                </div>
              </div>
            </div>

          </div>
        )
      })()}
    </motion.div>
  )
}

export default Settings
