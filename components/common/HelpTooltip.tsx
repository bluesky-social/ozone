import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

export function HelpTooltip({
  label,
  content,
}: {
  label: string
  content: ReactNode
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number }>()
  const open = !dismissed && (hovered || focused)

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setHovered(true)
    setDismissed(false)
  }
  const hide = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHovered(false), 150)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return

    const button = trigger.current
    const tooltip = panel.current
    const updatePosition = () => {
      const anchor = button.getBoundingClientRect()
      const bounds = tooltip.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      const padding = 8
      const gap = 4
      const left = Math.max(
        padding,
        Math.min(
          anchor.left + (anchor.width - bounds.width) / 2,
          width - bounds.width - padding,
        ),
      )
      const below = anchor.bottom + gap
      const top = Math.max(
        padding,
        below + bounds.height <= height - padding
          ? below
          : anchor.top - bounds.height - gap,
      )
      setPosition({ left, top })
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setDismissed(true)
      }
    }
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !button.contains(event.target) &&
        !tooltip.contains(event.target)
      ) {
        setDismissed(true)
      }
    }

    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    observer.observe(button)
    observer.observe(tooltip)
    window.addEventListener('resize', updatePosition)
    document.addEventListener('scroll', updatePosition, true)
    document.addEventListener('keydown', dismissOnEscape, true)
    document.addEventListener('pointerdown', dismissOutside, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('keydown', dismissOnEscape, true)
      document.removeEventListener('pointerdown', dismissOutside, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="inline-flex shrink-0 cursor-help rounded text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:text-gray-500"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={() => setFocused(false)}
        onClick={(event) => {
          event.stopPropagation()
          setDismissed(false)
        }}
      >
        <InformationCircleIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            onClick={(event) => event.stopPropagation()}
            className="fixed z-50 max-h-[calc(100dvh-1rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md border border-gray-200 bg-white p-2.5 text-left text-xs font-normal normal-case leading-normal tracking-normal text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
