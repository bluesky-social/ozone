import {
  ExclamationCircleIcon,
  UserGroupIcon,
  BoltIcon,
  QueueListIcon,
  CommandLineIcon,
  SunIcon,
  MoonIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  InboxStackIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useKBar } from 'kbar'
import { MouseEventHandler } from 'react'

export const ICONS = {
  reports: ExclamationCircleIcon,
  actions: BoltIcon,
  events: QueueListIcon,
  repositories: UserGroupIcon,
  command: CommandLineIcon,
  sun: SunIcon,
  moon: MoonIcon,
  configure: WrenchScrewdriverIcon,
  search: MagnifyingGlassIcon,
  verification: CheckCircleIcon,
  clock: ClockIcon,
  queues: InboxStackIcon,
  document: DocumentTextIcon,
  analytics: ChartBarIcon,
}

export type SidebarNavItem = {
  name: string
  icon: keyof typeof ICONS
} & (
  | {
      href: string
    }
  | {
      onClick: (context: {
        kbar: ReturnType<typeof useKBar>
        toggleTheme: () => void
      }) => MouseEventHandler<HTMLButtonElement> | undefined
    }
)

export const NAV_ITEMS: SidebarNavItem[] = [
  { name: 'Reports', href: '/reports', icon: 'reports' },
  { name: 'Queues', href: '/queues', icon: 'queues' },
  { name: 'Events', href: '/events', icon: 'events' },
  { name: 'Analytics', href: '/analytics', icon: 'analytics' },
  { name: 'Repositories', href: '/repositories', icon: 'repositories' },
  {
    name: 'Ctrl Panel',
    icon: 'command',
    onClick:
      ({ kbar }) =>
      () =>
        kbar.query.toggle(),
  },
  {
    name: 'Search',
    href: '/search',
    icon: 'search',
  },
  {
    name: 'Configure',
    href: '/configure',
    icon: 'configure',
  },
  {
    name: 'Schedule',
    href: '/scheduled-actions',
    icon: 'clock',
  },
  {
    name: 'Verification',
    href: '/verification',
    icon: 'verification',
  },
  {
    name: 'Theme',
    icon: 'sun',
    onClick: ({ toggleTheme }) => toggleTheme,
  },
]

export function isCurrent(
  currentPathname: string,
  item: SidebarNavItem,
): boolean {
  if (!('href' in item)) return false
  if (item.href === '/') {
    return currentPathname === item.href
  }
  return (
    currentPathname === item.href || currentPathname.startsWith(`${item.href}/`)
  )
}
