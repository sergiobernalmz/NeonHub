import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

const Select = ({ options = [], value, onChange, placeholder = 'Selecciona...', className = '' }) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)

  const selected = useMemo(() => options.find(o => String(o.value) === String(value)), [options, value])

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault()
      setOpen(true)
      setActiveIndex(Math.max(0, options.findIndex(o => String(o.value) === String(value))))
      return
    }

    if (open) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((idx) => Math.min(options.length - 1, (idx === -1 ? 0 : idx + 1)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((idx) => Math.max(0, (idx === -1 ? 0 : idx - 1)))
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const opt = options[activeIndex]
        if (opt) {
          onChange(opt.value)
          setOpen(false)
        }
      }
    }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={[
          'w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-gray-900 shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
          className,
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
          >
            <div className="max-h-64 overflow-y-auto py-1">
              {options.map((opt, idx) => {
                const selected = String(opt.value) === String(value)
                const active = idx === activeIndex
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={[
                      'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selected && <Check className="w-4 h-4 text-blue-600" />}
                  </li>
                )
              })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Select
