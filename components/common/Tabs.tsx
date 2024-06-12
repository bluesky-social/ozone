import { classNames } from '@/lib/util'
import { HTMLAttributes, ReactNode, useEffect, useState } from 'react'

export type TabView<ViewName> = {
  view: ViewName
  label: string
  sublabel?: string
}

export function Tabs<ViewName>({
  currentView,
  onSetCurrentView,
  views,
  fullWidth,
}: {
  currentView: ViewName
  onSetCurrentView: (v: ViewName) => void
  views: TabView<ViewName>[]
  fullWidth?: boolean
}) {
  return (
    <div className="mt-6 sm:mt-2 2xl:mt-5">
      <div className="border-b border-gray-200">
        <div
          className={`mx-auto max-w-5xl ${
            fullWidth ? '' : 'px-4 sm:px-6 lg:px-8'
          }`}
        >
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {views.map(({ view, label, sublabel }) => (
              <Tab
                key={label}
                {...{ view, label, sublabel, currentView, onSetCurrentView }}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
function Tab<ViewName>({
  view,
  label,
  sublabel,
  currentView,
  onSetCurrentView,
}: {
  currentView: ViewName
  onSetCurrentView: (v: ViewName) => void
} & TabView<ViewName>) {
  return (
    <span
      className={classNames(
        view === currentView
          ? 'border-pink-500 dark:border-teal-400 text-gray-900 dark:text-teal-500'
          : 'border-transparent text-gray-500 dark:text-gray-50 hover:text-gray-700 dark:hover:text-teal-200 hover:border-gray-300 dark:hover:border-teal-300',
        'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer',
      )}
      aria-current={view === currentView ? 'page' : undefined}
      onClick={() => onSetCurrentView(view)}
    >
      {label}{' '}
      {sublabel ? (
        <span className="text-xs font-bold text-gray-400">{sublabel}</span>
      ) : undefined}
    </span>
  )
}

export function TabsPanel<ViewName>({
  views,
  fallback,
  ...props
}: {
  views: (TabView<ViewName> & { content: ReactNode })[]
  fallback?: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
  const available = views.filter((v) => v.content)
  const defaultView = available[0]?.view

  const [currentView, setCurrentView] = useState(defaultView)

  const current = available.find((v) => v.view === currentView)

  useEffect(() => {
    if (!current?.view) setCurrentView(defaultView)
  }, [current?.view, defaultView])

  return (
    <div {...props}>
      <Tabs
        views={available}
        currentView={currentView}
        onSetCurrentView={setCurrentView}
      />
      {current?.content ?? fallback}
    </div>
  )
}
