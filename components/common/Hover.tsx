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
// the trigger is hovered or focused. For richer popovers use `Tooltip`.
//
// The panel is offset with padding (not margin) so there is no dead gap
// between trigger and panel that would dismiss it mid-mouse-travel, and
// hiding is delayed briefly so a stray mouse-out doesn't drop the panel
// while reaching for its contents. The wrapper is focusable so keyboard
// users can open the panel and tab into any interactive content inside.
export const Hover = ({
  children,
  content,
  className = '',
  panelClassName = '',
}: HoverProps) => {
  return (
    <div
      tabIndex={0}
      className={`group/hover-card relative w-fit ${className}`}
    >
      {children}
      <div className="invisible opacity-0 transition-all delay-200 duration-150 group-hover/hover-card:visible group-hover/hover-card:opacity-100 group-hover/hover-card:delay-0 group-focus-within/hover-card:visible group-focus-within/hover-card:opacity-100 group-focus-within/hover-card:delay-0 absolute left-0 top-full z-10 pt-1">
        <div
          className={`w-64 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2.5 space-y-2 ${panelClassName}`}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
