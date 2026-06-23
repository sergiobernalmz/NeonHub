import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, X, Check, Tag, Truck, Save, Package, MapPin, Clock } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import API_BASE_URL from '../config/api'
import Toggle from '../components/ui/Toggle'

const EMPTY_FORM = {
  code: '', type: 'percentage', value: '', description: '',
  min_order_amount: '', max_uses: '', expires_at: '', is_active: true
}

export default function DiscountCodes() {
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()
  const [codes, setCodes]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)   // objeto de descuento que se está editando
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const [shipping, setShipping] = useState({ free_shipping_disabled: false, free_shipping_threshold: 50, shipping_cost: 4.99 })
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingSaving, setShippingSaving]   = useState(false)

  const [fulfillment, setFulfillment] = useState({ fulfillment_mode: 'both', shipping_cost: 4.99, pickup_schedule: null })
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false)
  const [fulfillmentSaving, setFulfillmentSaving]   = useState(false)

  // pickup_schedule local state helpers
  const DAYS = [
    { key: 'monday', label: 'Lunes' }, { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' }, { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' }, { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ]
  const defaultSchedule = () => Object.fromEntries(DAYS.map(d => [d.key, { open: false, from: '09:00', to: '18:00' }]))

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'X-Store-ID': localStorage.getItem('store_id') || ''
  })

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/discounts`, { headers: headers() })
      const data = await res.json()
      if (data.success) setCodes(data.data)
      else showError('Error al cargar los códigos')
    } catch {
      showError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchShipping = useCallback(async () => {
    setShippingLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/discounts/shipping`, { headers: headers() })
      const data = await res.json()
      if (data.success) setShipping(data.data)
    } catch {} finally { setShippingLoading(false) }
  }, [])

  const fetchFulfillment = useCallback(async () => {
    setFulfillmentLoading(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/discounts/fulfillment`, { headers: headers() })
      const data = await res.json()
      if (data.success) {
        setFulfillment({
          fulfillment_mode: data.data.fulfillment_mode || 'both',
          shipping_cost: data.data.shipping_cost ?? 4.99,
          pickup_schedule: data.data.pickup_schedule || defaultSchedule()
        })
      }
    } catch {} finally { setFulfillmentLoading(false) }
  }, [])

  const saveFulfillment = async () => {
    setFulfillmentSaving(true)
    try {
      const body = {
        fulfillment_mode: fulfillment.fulfillment_mode,
        shipping_cost: parseFloat(fulfillment.shipping_cost) || 0,
        pickup_schedule: fulfillment.pickup_schedule
      }
      const res  = await fetch(`${API_BASE_URL}/discounts/fulfillment`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) showSuccess(t('deliverySettingsSaved'))
      else showError(data.message || 'Error al guardar')
    } catch { showError('Error de conexión') } finally { setFulfillmentSaving(false) }
  }

  const saveShipping = async () => {
    setShippingSaving(true)
    try {
      const res  = await fetch(`${API_BASE_URL}/discounts/shipping`, {
        method: 'PUT', headers: headers(), body: JSON.stringify(shipping)
      })
      const data = await res.json()
      if (data.success) showSuccess(t('shippingSettings') + ' guardada')
      else showError(data.message)
    } catch { showError('Error') } finally { setShippingSaving(false) }
  }

  useEffect(() => { fetchCodes(); fetchShipping(); fetchFulfillment() }, [fetchCodes, fetchShipping, fetchFulfillment])

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true) }
  const openEdit   = (c) => {
    setForm({
      code: c.code, type: c.type, value: String(c.value),
      description: c.description || '', min_order_amount: String(c.min_order_amount || ''),
      max_uses: c.max_uses != null ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      is_active: c.is_active
    })
    setEditing(c)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.code || !form.value) return showError('Código y valor son obligatorios')
    setSaving(true)
    try {
      const body = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: parseFloat(form.value),
        description: form.description || null,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
        is_active: form.is_active
      }

      const url    = editing ? `${API_BASE_URL}/discounts/${editing.id}` : `${API_BASE_URL}/discounts`
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) })
      const data   = await res.json()

      if (data.success) {
        showSuccess(t('discountSaved'))
        setShowForm(false)
        fetchCodes()
      } else {
        showError(data.message || 'Error al guardar')
      }
    } catch {
      showError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/discounts/${c.id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ is_active: !c.is_active })
      })
      const data = await res.json()
      if (data.success) {
        showSuccess(data.data.is_active ? t('activate') : t('deactivate'))
        fetchCodes()
      }
    } catch { showError('Error') }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`¿Eliminar el código "${c.code}"?`)) return
    try {
      const res  = await fetch(`${API_BASE_URL}/discounts/${c.id}`, { method: 'DELETE', headers: headers() })
      const data = await res.json()
      if (data.success) { showSuccess(t('discountDeleted')); fetchCodes() }
      else showError(data.message)
    } catch { showError('Error') }
  }

  const expired = (c) => c.expires_at && new Date(c.expires_at) < new Date()
  const maxed   = (c) => c.max_uses != null && c.used_count >= c.max_uses

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('discountCodesTitle')}</h1>
            <p className="text-gray-400 text-sm">{t('discountCodesDescription')}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-purple-500/30"
        >
          <Plus className="w-4 h-4" />
          {t('newDiscountCode')}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('noDiscounts')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-5 py-4 text-left">Código</th>
                <th className="px-5 py-4 text-left">Descuento</th>
                <th className="px-5 py-4 text-left">Mínimo</th>
                <th className="px-5 py-4 text-left">Usos</th>
                <th className="px-5 py-4 text-left">Total descontado</th>
                <th className="px-5 py-4 text-left">Expira</th>
                <th className="px-5 py-4 text-left">Estado</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {codes.map(c => (
                <tr key={c.id} className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg">{c.code}</span>
                    {c.description && <p className="text-gray-500 text-xs mt-1">{c.description}</p>}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {c.type === 'percentage'
                      ? <span className="text-green-400">{parseFloat(c.value)}% off</span>
                      : <span className="text-emerald-400">€{parseFloat(c.value).toFixed(2)} off</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-400">
                    {parseFloat(c.min_order_amount) > 0 ? `€${parseFloat(c.min_order_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-4 text-gray-400">
                    {c.max_uses != null
                      ? <span className={maxed(c) ? 'text-red-400' : ''}>{c.used_count}/{c.max_uses}</span>
                      : <span>{c.used_count} / ∞</span>}
                  </td>
                  <td className="px-5 py-4 font-semibold" style={{ color: '#22c55e' }}>
                    €{c.total_discounted || '0.00'}
                  </td>
                  <td className="px-5 py-4 text-gray-400">
                    {c.expires_at
                      ? <span className={expired(c) ? 'text-red-400' : ''}>{new Date(c.expires_at).toLocaleDateString('es')}</span>
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    {expired(c) || maxed(c) ? (
                      <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">Agotado</span>
                    ) : c.is_active ? (
                      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Activo</span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-500/10 px-2 py-1 rounded-full">Inactivo</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Toggle
                        checked={!!c.is_active}
                        onChange={() => toggleActive(c)}
                        size="sm"
                        color="green"
                      />
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shipping settings */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Configuración de envío</h2>
            <p className="text-gray-400 text-sm">Controla cuándo el envío es gratis</p>
          </div>
        </div>

        {shippingLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5 max-w-lg">
            {/* Disable free shipping toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Envío siempre de pago</p>
                <p className="text-gray-500 text-xs mt-0.5">El envío gratis nunca se aplica</p>
              </div>
              <Toggle
                checked={!!shipping.free_shipping_disabled}
                onChange={(val) => setShipping(s => ({ ...s, free_shipping_disabled: val }))}
                color="red"
              />
            </div>

            {!shipping.free_shipping_disabled && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Umbral para envío gratis (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={shipping.free_shipping_threshold}
                  onChange={e => setShipping(s => ({ ...s, free_shipping_threshold: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <p className="text-gray-500 text-xs mt-1">Pedidos por encima de este importe tendrán envío gratis</p>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Coste de envío (€)</label>
              <input
                type="number" min="0" step="0.01"
                value={shipping.shipping_cost}
                onChange={e => setShipping(s => ({ ...s, shipping_cost: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <button
              onClick={saveShipping}
              disabled={shippingSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
            >
              {shippingSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
              Guardar configuración de envío
            </button>
          </div>
        )}
      </div>

      {/* Fulfillment configuration */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Configuración de entrega</h2>
            <p className="text-gray-400 text-sm">Define cómo los clientes reciben sus pedidos</p>
          </div>
        </div>

        {fulfillmentLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-6 max-w-xl">
            {/* Mode selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Modo de entrega</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'shipping', label: 'Solo envíos', icon: Truck },
                  { value: 'pickup',   label: 'Solo recogida', icon: MapPin },
                  { value: 'both',     label: 'Envío y recogida', icon: Package }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFulfillment(f => ({ ...f, fulfillment_mode: value }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                      fulfillment.fulfillment_mode === value
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shipping cost — visible if not pickup-only */}
            {fulfillment.fulfillment_mode !== 'pickup' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Coste de envío (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={fulfillment.shipping_cost}
                  onChange={e => setFulfillment(f => ({ ...f, shipping_cost: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
                <p className="text-gray-500 text-xs mt-1">Coste base aplicado a cada pedido con envío</p>
              </div>
            )}

            {/* Pickup schedule — visible if not shipping-only */}
            {fulfillment.fulfillment_mode !== 'shipping' && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <label className="text-sm font-medium text-gray-300">Horario de recogida</label>
                </div>
                <div className="space-y-2">
                  {DAYS.map(({ key, label }) => {
                    const sched = fulfillment.pickup_schedule?.[key] || { open: false, from: '09:00', to: '18:00' }
                    const update = (patch) => setFulfillment(f => ({
                      ...f,
                      pickup_schedule: { ...(f.pickup_schedule || {}), [key]: { ...sched, ...patch } }
                    }))
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <Toggle
                          checked={!!sched.open}
                          onChange={(val) => update({ open: val })}
                          size="sm"
                          color="violet"
                        />
                        <span className={`w-20 text-xs font-medium ${sched.open ? 'text-gray-200' : 'text-gray-600'}`}>{label}</span>
                        {sched.open && (
                          <>
                            <input type="time" value={sched.from}
                              onChange={e => update({ from: e.target.value })}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500" />
                            <span className="text-gray-600 text-xs">→</span>
                            <input type="time" value={sched.to}
                              onChange={e => update({ to: e.target.value })}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500" />
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={saveFulfillment}
              disabled={fulfillmentSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm disabled:opacity-50 transition-all"
            >
              {fulfillmentSaving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save className="w-4 h-4" />}
              Guardar configuración de entrega
            </button>
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editing ? 'Editar código' : 'Nuevo código'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">Código *</label>
                  <input
                    value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="VERANO20"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Tipo *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Fijo (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Valor *</label>
                  <input type="number" min="0.01" step="0.01"
                    value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percentage' ? '20' : '10.00'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Pedido mínimo (€)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Usos máximos</label>
                  <input type="number" min="1"
                    value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="∞ ilimitado"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Fecha de expiración</label>
                  <input type="date"
                    value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">Descripción (opcional)</label>
                  <input
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Descuento de verano"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Toggle
                    checked={!!form.is_active}
                    onChange={(val) => setForm({ ...form, is_active: val })}
                    color="green"
                  />
                  <span className="text-sm text-gray-300">{form.is_active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check className="w-4 h-4" />}
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear código'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
