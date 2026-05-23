function ActionButton({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
}) {
  const base =
    'rounded-xl px-5 py-3 font-medium transition'

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    dark: 'bg-slate-800 text-white hover:bg-slate-900',
  }

  const disabledStyle = disabled
    ? 'cursor-not-allowed bg-slate-300 text-white hover:bg-slate-300'
    : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabledStyle} ${className}`}
    >
      {children}
    </button>
  )
}

export default ActionButton