import { useId, useState, type ReactNode } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

export const QUEUE_HELP = {
  strictAccess:
    'Admins can always access this queue and its reports. Other roles need an active queue assignment. General report searches and moderation history keep their existing permissions.',
  strictIndicator:
    'Strict access: visible to admins and assigned queue members.',
}

export function QueueHelp({
  label,
  description,
  id,
  children = <QuestionMarkCircleIcon className="h-4 w-4" aria-hidden="true" />,
}: {
  label: string
  description: string
  id?: string
  children?: ReactNode
}) {
  const generatedId = useId()
  const descriptionId = id ?? generatedId
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const open = !dismissed && (hovered || focused)

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => {
        setHovered(true)
        setDismissed(false)
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={descriptionId}
        className="rounded text-gray-500 dark:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={() => setFocused(false)}
        onClick={() => setDismissed(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            setDismissed(true)
          }
        }}
      >
        {children}
      </button>
      <span
        id={descriptionId}
        role="tooltip"
        className={`${open ? 'visible' : 'invisible'} absolute left-0 top-full z-30 w-64 rounded-md border border-gray-200 bg-white p-3 text-xs font-normal text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200`}
      >
        {description}
      </span>
    </span>
  )
}
