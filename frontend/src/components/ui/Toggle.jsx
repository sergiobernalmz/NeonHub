
const SIZES = {
  sm: { track: 'w-8 h-4',   thumb: 'w-3 h-3',   translate: 'translateX(18px)' },
  md: { track: 'w-11 h-6',  thumb: 'w-5 h-5',   translate: 'translateX(20px)' },
  lg: { track: 'w-14 h-7',  thumb: 'w-5.5 h-5.5', translate: 'translateX(28px)' },
}

const COLORS = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  red:    'bg-red-500',
  violet: 'bg-violet-500',
}

const Toggle = ({ checked = false, onChange, size = 'md', color = 'blue', disabled = false, className = '' }) => {
  const s = SIZES[size] || SIZES.md
  const activeColor = COLORS[color] || COLORS.blue

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`
        relative flex-shrink-0 ${s.track} rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        ${checked ? activeColor : 'bg-gray-600 dark:bg-gray-600'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span
        aria-hidden="true"
        className={`
          absolute top-0.5 left-0.5 ${s.thumb} rounded-full bg-white shadow-md
          transition-transform duration-200 ease-in-out
        `}
        style={{ transform: checked ? s.translate : 'translateX(0px)' }}
      />
    </button>
  )
}

export default Toggle
