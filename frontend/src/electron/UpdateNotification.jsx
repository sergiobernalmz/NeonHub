import { useState, useEffect } from 'react'

export default function UpdateNotification() {
  const [update, setUpdate] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [transferred, setTransferred] = useState(0)
  const [total, setTotal] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!window.electron) return

    // cogemos cualquier actualización que haya llegado antes de montar el componente
    window.electron.getPendingUpdate().then(data => { if (data) setUpdate(data) })

    // escuchamos actualizaciones que lleguen después de montar
    const cleanupUpdate = window.electron.onUpdateAvailable((data) => setUpdate(data))

    window.electron.onDownloadProgress((data) => {
      setProgress(data.percent)
      setSpeed(data.bytesPerSecond || 0)
      setTransferred(data.transferred || 0)
      setTotal(data.total || 0)
    })
    window.electron.onUpdateDownloaded(() => {
      setReady(true)
      setDownloading(false)
    })

    return () => { cleanupUpdate?.() }
  }, [])

  if (!update) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: '12px', padding: '16px 20px', width: '320px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {!ready ? (
        <>
          <p style={{ color: '#f1f5f9', fontWeight: 700, margin: '0 0 4px', fontSize: '14px' }}>
            🆕 Actualización disponible
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px' }}>
            NeonHub {update.version} está disponible
          </p>

          {downloading ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Descargando… {progress}%</span>
                {speed > 0 && (
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    {(speed / 1024 / 1024).toFixed(1)} MB/s
                  </span>
                )}
              </div>
              <div style={{ background: '#0f172a', borderRadius: '4px', height: '6px', marginBottom: '6px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', height: '6px', borderRadius: '4px',
                  width: `${progress}%`, transition: 'width 0.3s',
                }} />
              </div>
              {total > 0 && (
                <p style={{ color: '#475569', fontSize: '11px', margin: 0, textAlign: 'right' }}>
                  {(transferred / 1024 / 1024).toFixed(1)} / {(total / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setDownloading(true); window.electron.downloadUpdate() }}
                style={{
                  flex: 1, background: '#6366f1', border: 'none',
                  borderRadius: '8px', padding: '8px', color: '#fff',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                }}
              >
                Descargar
              </button>
              <button
                onClick={() => setUpdate(null)}
                style={{
                  background: 'none', border: '1px solid #334155',
                  borderRadius: '8px', padding: '8px 12px',
                  color: '#64748b', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Ahora no
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ color: '#22c55e', fontWeight: 700, margin: '0 0 4px', fontSize: '14px' }}>
            ✅ Lista para instalar
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px' }}>
            La actualización se instalará al cerrar la app
          </p>
          <button
            onClick={() => window.electron.installUpdate()}
            style={{
              width: '100%', background: '#22c55e', border: 'none',
              borderRadius: '8px', padding: '8px', color: '#fff',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}
          >
            Reiniciar e instalar ahora
          </button>
        </>
      )}
    </div>
  )
}
