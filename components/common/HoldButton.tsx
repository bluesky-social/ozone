import { ComponentProps, useCallback, useRef, useState } from 'react'

type HoldButtonProps = Omit<ComponentProps<'button'>, 'onClick'> & {
  appearance: 'outlined' | 'primary' | 'negative'
  size?: 'xs' | 'sm' | 'md'
  onHoldComplete: () => void
  holdDuration?: number
}

const appearanceClassNames = {
  outlined:
    'bg-transparent dark:bg-slate-800 disabled:bg-gray-300 text-black dark:text-gray-50 border-gray-700 dark:border-slate-600',
  primary:
    'bg-indigo-600 dark:bg-teal-600 disabled:bg-gray-400 text-white border-transparent',
  negative:
    'bg-red-600 dark:bg-red-700 disabled:bg-gray-400 text-white border-transparent',
}

const sizeClassNames = {
  xs: 'px-1 py-1 text-xs font-light',
  sm: 'px-2 py-1 text-sm font-light',
  md: 'px-4 py-2 text-base font-medium',
}

const fillClassNames = {
  outlined: 'bg-gray-500/50 dark:bg-slate-400/40',
  primary: 'bg-white/30 dark:bg-white/20',
  negative: 'bg-white/30 dark:bg-white/20',
}

export function HoldButton({
  className = '',
  appearance,
  size = 'md',
  onHoldComplete,
  holdDuration = 1000,
  disabled,
  children,
  ...others
}: HoldButtonProps) {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    setHolding(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    setHolding(true)
    timerRef.current = setTimeout(() => {
      setHolding(false)
      timerRef.current = null
      onHoldComplete()
    }, holdDuration)
  }, [disabled, holdDuration, onHoldComplete])

  return (
    <button
      type="button"
      disabled={disabled}
      className={`relative overflow-hidden inline-flex items-center justify-center rounded border font-medium shadow-sm focus:outline-none select-none ${appearanceClassNames[appearance]} ${sizeClassNames[size]} ${className}`}
      onMouseDown={start}
      onMouseUp={clear}
      onMouseLeave={clear}
      onTouchStart={start}
      onTouchEnd={clear}
      onTouchCancel={clear}
      {...others}
    >
      <div
        className={`absolute inset-y-0 left-0 ${fillClassNames[appearance]} ${holding ? 'w-full' : 'w-0'}`}
        style={{
          transition: holding
            ? `width ${holdDuration}ms linear`
            : 'width 150ms ease-out',
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  )
}
