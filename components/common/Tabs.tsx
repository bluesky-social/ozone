import { classNames } from '@/lib/util'
import {
  HTMLAttributes,
  Key,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'

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

export type TabsPanelProps<ViewName extends Key> = {
  views: (TabView<ViewName> & { content: ReactNode })[]
  currentView?: ViewName
  onCurrentView?: (v: ViewName) => void
  fallback?: ReactNode
} & HTMLAttributes<HTMLDivElement>

export function TabsPanel<ViewName extends Key>({
  views,
  fallback,
  currentView: currentViewExternal,
  onCurrentView,
  ...props
}: TabsPanelProps<ViewName>) {
  const available = views.filter((v) => v.content)
  const defaultView = available[0]?.view as ViewName | undefined

  const [currentViewInternal, setCurrentViewInternal] = useState(defaultView)
  const setCurrent = useCallback(
    (v: ViewName) => {
      setCurrentViewInternal(v)
      onCurrentView?.(v)
    },
    [onCurrentView],
  )
  const current =
    (currentViewExternal != null
      ? available.find((v) => v.view === currentViewExternal)
      : undefined) ??
    (currentViewInternal != null
      ? available.find((v) => v.view === currentViewInternal)
      : undefined) ??
    available[0]

  useEffect(() => {
    if (current?.view !== currentViewExternal) onCurrentView?.(current?.view)
  }, [current?.view, currentViewExternal, onCurrentView])

  useEffect(() => {
    setCurrentViewInternal(current?.view)
  }, [current?.view])

  return (
    <div {...props}>
      <Tabs
        views={available}
        currentView={current?.view}
        onSetCurrentView={setCurrent}
      />
      <div key={current?.view}>{current?.content ?? fallback}</div>
    </div>
  )
}
