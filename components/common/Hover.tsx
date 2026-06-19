import { ReactNode } from 'react'

export type HoverProps = {
  // The always-visible trigger content.
  children: ReactNode
  // The content revealed in the panel on hover.
  content: ReactNode
  className?: string
  panelClassName?: string
}

// Lightweight CSS-only hover reveal: shows `content` in a floating panel when
// the trigger is hovered. For richer, focus-managed popovers use `Tooltip`.
export const Hover = ({
  children,
  content,
  className = '',
  panelClassName = '',
}: HoverProps) => {
  return (
    <div className={`group relative w-fit ${className}`}>
      {children}
      <div
        className={`invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2.5 space-y-2 ${panelClassName}`}
      >
        {content}
      </div>
    </div>
  )
}
