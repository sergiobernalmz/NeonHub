import React, { useRef, useCallback } from 'react'

const DualRangeSlider = ({
  min = 0,
  max = 1000,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  formatLabel = (n) => `€${Number(n).toFixed(0)}`,
}) => {
  const clampedMin = Math.max(min, Math.min(valueMin, max))
  const clampedMax = Math.max(min, Math.min(valueMax, max))
  const low = Math.min(clampedMin, clampedMax)
  const high = Math.max(clampedMin, clampedMax)

  const percent = (n) => ((n - min) * 100) / (max - min)
  const left = percent(low)
  const right = percent(high)

  const trackRef = useRef(null)

  const clampToStep = useCallback((val) => {
    const clamped = Math.max(min, Math.min(val, max))
    const steps = Math.round((clamped - min) / step)
    return min + steps * step
  }, [min, max, step])

  const onPointerMove = useCallback((type, e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX)
    if (typeof x !== 'number') return
    const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
    const value = clampToStep(min + ratio * (max - min))
    if (type === 'min') {
      const guarded = Math.min(value, high - step)
      onChange(guarded, high)
    } else {
      const guarded = Math.max(value, low + step)
      onChange(low, guarded)
    }
  }, [trackRef, min, max, step, low, high, onChange, clampToStep])

  const attachPointer = useCallback((type, downEvent) => {
    downEvent.preventDefault()
    const move = (e) => onPointerMove(type, e)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up)
  }, [onPointerMove])

  return (
    <div className="w-full select-none">
  <div ref={trackRef} className="relative h-12">
        {/* Track background */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gray-200" />
        {/* Selected range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-blue-500"
          style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
        />

        {/* Tooltips */}
        <div
          className="absolute -top-2 -translate-y-full -translate-x-1/2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs shadow pointer-events-none"
          style={{ left: `clamp(8px, ${left}%, calc(100% - 8px))` }}
        >
          {formatLabel(low)}
        </div>
        <div
          className="absolute -top-2 -translate-y-full -translate-x-1/2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs shadow pointer-events-none"
          style={{ left: `clamp(8px, ${right}%, calc(100% - 8px))`, marginTop: '2px' }}
        >
          {formatLabel(high)}
        </div>

        {/* Custom handles */}
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={low}
          aria-label="Precio mínimo"
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow cursor-pointer"
          style={{ left: `calc(${left}% - 8px)`, zIndex: (right - left) < 2 ? 40 : 30 }}
          onPointerDown={(e) => attachPointer('min', e)}
          onTouchStart={(e) => attachPointer('min', e)}
        />
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={high}
          aria-label="Precio máximo"
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow cursor-pointer"
          style={{ left: `calc(${right}% - 8px)` }}
          onPointerDown={(e) => attachPointer('max', e)}
          onTouchStart={(e) => attachPointer('max', e)}
        />
      </div>
      {/* Thumb styling via CSS */}
      <style>{``}</style>
    </div>
  )
}

export default DualRangeSlider
