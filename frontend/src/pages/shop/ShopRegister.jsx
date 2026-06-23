import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, AtSign, Check, X } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfig } from '../../context/ConfigContext'
import CSSVariables from '../../components/shop/CSSVariables'
import axios from 'axios'
import { calcPasswordEntropy, getPasswordStrength, validatePasswordStrength } from '../../utils/validation'

// Field fuera del componente para que la referencia no cambie en cada render
const Field = ({
  name, label, type = 'text', placeholder, icon: Icon,
  showToggle, showState, onToggle,
  labelColor, mutedColor, inputStyle, fieldErrors,
  successBorder, onChange, onFocus, onBlur,
  value, suffix,
}) => (
  <div>
    <label className="block text-sm font-medium mb-2" style={{ color: labelColor }}>{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: mutedColor }} />
      <input
        type={showToggle ? (showState ? 'text' : 'password') : type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          ...inputStyle,
          borderColor: fieldErrors[name] ? '#ef4444' : successBorder ? '#22c55e' : inputStyle.borderColor,
          transition: 'border-color .15s, box-shadow .15s',
        }}
        className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
        placeholder={placeholder}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
          style={{ color: mutedColor }}
        >
          {showState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>
      )}
    </div>
    {fieldErrors[name] && (
      <p className="mt-1 text-xs text-red-500">{fieldErrors[name]}</p>
    )}
  </div>
)

const PasswordStrengthBar = ({ password, mutedColor }) => {
  if (!password) return null
  const entropy = calcPasswordEntropy(password)
  const s = getPasswordStrength(entropy)
  return (
    <div className="mt-1.5">
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${s.pct}%`, background: s.color, height: '100%', borderRadius: 3, transition: 'width .2s, background .2s' }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs" style={{ color: s.color }}>{s.label}</span>
        <span className="text-xs" style={{ color: mutedColor }}>{entropy} bits</span>
      </div>
    </div>
  )
}

const PasswordRequirements = ({ password, mutedColor }) => {
  if (!password) return null
  const reqs = validatePasswordStrength(password)
  const items = [
    { key: 'length',    label: 'Mínimo 8 caracteres' },
    { key: 'uppercase', label: 'Una letra mayúscula' },
    { key: 'number',    label: 'Un número' },
    { key: 'special',   label: 'Un carácter especial' },
  ]
  return (
    <ul className="mt-2 space-y-0.5">
      {items.map(({ key, label }) => (
        <li key={key} className="flex items-center gap-1.5 text-xs">
          {reqs[key]
            ? <Check className="w-3 h-3 text-green-400 shrink-0" />
            : <X className="w-3 h-3 text-red-400 shrink-0" />
          }
          <span style={{ color: reqs[key] ? '#4ade80' : mutedColor }}>{label}</span>
        </li>
      ))}
    </ul>
  )
}

const ShopRegister = () => {
  const config   = useConfig()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const level = user.roles?.reduce((max, r) => Math.max(max, r.level || 0), 0) ?? 0
      navigate(level >= 40 ? '/dashboard' : '/shop', { replace: true })
    }
  }, [user])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirm,  setShowConfirm]         = useState(false)
  const [loading,      setLoading]             = useState(false)
  const [error,        setError]               = useState('')
  const [fieldErrors,  setFieldErrors]         = useState({})
  const [success,      setSuccess]             = useState(false)
  const [usernameStatus, setUsernameStatus]    = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const usernameTimer = useRef(null)

  const storeName = config?.name || 'Tienda'
  const logo      = config?.logo
  const primary   = config?.colors?.primary || '#2563eb'
  const bg        = config?.colors?.background || '#ffffff'
  const isDark    = bg !== '#ffffff'

  const cardStyle  = isDark
    ? { background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.1)' }
    : { background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }
  const labelColor = isDark ? '#94a3b8' : '#374151'
  const inputStyle = isDark
    ? { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#f1f5f9' }
    : { background: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }
  const mutedColor = isDark ? '#64748b' : '#6b7280'

  // auto-generar username desde el email si está vacío
  const autoGenRef = useRef(true)
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'email' && autoGenRef.current) {
        const prefix = value.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
        next.username = prefix
        scheduleUsernameCheck(prefix)
      }
      if (name === 'username') {
        autoGenRef.current = false
        scheduleUsernameCheck(value)
      }
      return next
    })
    setFieldErrors(prev => ({ ...prev, [name]: '' }))
  }

  const scheduleUsernameCheck = (username) => {
    clearTimeout(usernameTimer.current)
    const u = username.trim()
    if (!u || u.length < 3 || u.length > 30 || !/^[a-zA-Z0-9_]+$/.test(u)) {
      setUsernameStatus(u.length > 0 ? 'invalid' : null)
      return
    }
    setUsernameStatus('checking')
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/auth/check-username?username=${encodeURIComponent(u)}`)
        setUsernameStatus(res.data.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus(null)
      }
    }, 400)
  }

  const handleInputFocus = (e) => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}22` }
  const handleInputBlur  = (e) => { e.target.style.borderColor = inputStyle.borderColor; e.target.style.boxShadow = '' }

  const pwdReqs    = validatePasswordStrength(formData.password)
  const entropy    = calcPasswordEntropy(formData.password)
  const confirmOk  = formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password
  const confirmBad = formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.password

  const validate = () => {
    const errs = {}
    if (!formData.firstName.trim()) errs.firstName = 'El nombre es obligatorio'
    const u = formData.username.trim()
    if (!u || u.length < 3 || u.length > 30 || !/^[a-zA-Z0-9_]+$/.test(u))
      errs.username = 'Entre 3 y 30 caracteres, solo letras, números y _'
    else if (usernameStatus === 'taken')
      errs.username = 'Este nombre de usuario ya está en uso'
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = 'Introduce un email válido'
    if (!pwdReqs.isValid)
      errs.password = 'La contraseña no cumple los requisitos'
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = 'Las contraseñas no coinciden'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const canSubmit = !loading
    && formData.firstName.trim()
    && formData.username.trim().length >= 3
    && usernameStatus === 'available'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    && pwdReqs.isValid
    && confirmOk

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')
    try {
      await axios.post('/api/public/register', {
        username:   formData.username.trim(),
        email:      formData.email,
        password:   formData.password,
        first_name: formData.firstName.trim(),
        last_name:  formData.lastName.trim() || '',
      })
      setSuccess(true)
    } catch (err) {
      const { message, field } = err.response?.data || {}
      if (field) {
        setFieldErrors(prev => ({ ...prev, [field]: message }))
      } else {
        setError(message || 'Error al registrarse. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldProps = {
    labelColor, mutedColor, inputStyle, fieldErrors,
    onChange: handleChange, onFocus: handleInputFocus, onBlur: handleInputBlur,
  }

  const usernameIconSuffix = usernameStatus === 'checking'
    ? <span className="text-xs" style={{ color: mutedColor }}>…</span>
    : usernameStatus === 'available'
    ? <Check className="w-4 h-4 text-green-400" />
    : usernameStatus === 'taken'
    ? <X className="w-4 h-4 text-red-400" />
    : null

  if (success) {
    return (
      <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4">
        <CSSVariables config={config} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl p-10 border text-center backdrop-blur-sm shadow-xl"
          style={cardStyle}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${primary}20` }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke={primary} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: primary }}>¡Revisa tu email!</h2>
          <p className="text-sm mb-2" style={{ color: mutedColor }}>
            Te hemos enviado un email a{' '}
            <strong style={{ color: isDark ? '#f1f5f9' : '#111827' }}>{formData.email}</strong>.
          </p>
          <p className="text-sm mb-2" style={{ color: mutedColor }}>
            Haz clic en el enlace para verificar tu cuenta. Revisa también tu carpeta de spam.
          </p>
          <p className="text-xs mb-8" style={{ color: mutedColor }}>El enlace caduca en 24 horas.</p>
          <button
            onClick={() => navigate('/shop')}
            className="w-full py-3 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
          >
            Volver a la tienda
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="shop-root tenant-theme min-h-screen flex items-center justify-center p-4">
      <CSSVariables config={config} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt={storeName} className="h-14 mx-auto mb-4 object-contain" />
          ) : (
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
              style={{ backgroundColor: primary }}
            >
              <span className="text-2xl font-bold text-white">{storeName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: primary }}>{storeName}</h1>
          <p className="mt-1 text-sm" style={{ color: mutedColor }}>Crea tu cuenta</p>
        </div>

        <div className="rounded-2xl p-8 border backdrop-blur-sm shadow-xl" style={cardStyle}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field name="firstName" label="Nombre *"  placeholder="Ana"    icon={User} value={formData.firstName} {...fieldProps} />
              <Field name="lastName"  label="Apellido"  placeholder="García" icon={User} value={formData.lastName}  {...fieldProps} />
            </div>

            <div>
              <Field name="email" label="Email *" type="email" placeholder="tu@email.com" icon={Mail} value={formData.email} {...fieldProps} />
              {fieldErrors.email?.includes('registrado') && (
                <p className="mt-1 text-xs" style={{ color: mutedColor }}>
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="font-semibold underline" style={{ color: primary }}>
                    Inicia sesión
                  </Link>
                </p>
              )}
            </div>

            <div>
              <Field
                name="username" label="Nombre de usuario *" placeholder="tu_usuario"
                icon={AtSign} value={formData.username}
                suffix={usernameIconSuffix}
                {...fieldProps}
              />
              {!fieldErrors.username && usernameStatus === 'taken' && (
                <p className="mt-1 text-xs text-red-500">Este nombre de usuario ya está en uso</p>
              )}
              {!fieldErrors.username && usernameStatus === 'available' && (
                <p className="mt-1 text-xs text-green-400">✓ Nombre de usuario disponible</p>
              )}
              {!fieldErrors.username && usernameStatus === 'invalid' && formData.username.length > 0 && (
                <p className="mt-1 text-xs text-red-500">Solo letras, números y _, mínimo 3 caracteres</p>
              )}
            </div>

            <div>
              <Field
                name="password" label="Contraseña *" placeholder="Mínimo 8 caracteres"
                icon={Lock} showToggle showState={showPassword} onToggle={() => setShowPassword(v => !v)}
                value={formData.password} {...fieldProps}
              />
              <PasswordStrengthBar password={formData.password} mutedColor={mutedColor} />
              <PasswordRequirements password={formData.password} mutedColor={mutedColor} />
            </div>

            <div>
              <Field
                name="confirmPassword" label="Confirmar contraseña *" placeholder="Repite la contraseña"
                icon={Lock} showToggle showState={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                successBorder={confirmOk}
                value={formData.confirmPassword} {...fieldProps}
              />
              {!fieldErrors.confirmPassword && confirmBad && (
                <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
              )}
              {confirmOk && (
                <p className="mt-1 text-xs text-green-400">✓ Las contraseñas coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
              style={{ backgroundColor: primary, borderRadius: 'var(--btn-radius, 8px)' }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
              onMouseOut={e => { e.currentTarget.style.filter = '' }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: mutedColor }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: primary }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default ShopRegister
