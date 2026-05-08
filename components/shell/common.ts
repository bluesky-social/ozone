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
}

export type SidebarNavChild = {
  name: string
  href: string
  icon: keyof typeof ICONS
}

export type SidebarNavItem = {
  name: string
  icon: keyof typeof ICONS
  badge?: string
} & (
  | {
      href: string
    }
  | {
      onClick: (context: {
        kbar: ReturnType<typeof useKBar>
      }) => MouseEventHandler<HTMLButtonElement> | undefined
    }
  | {
      children: SidebarNavChild[]
    }
)

export const NAV_ITEMS: SidebarNavItem[] = [
  { name: 'Reports', href: '/reports', icon: 'reports' },
  { name: 'Queues', href: '/queues', icon: 'queues', badge: 'Beta' },
  { name: 'Events', href: '/events', icon: 'events' },
  {
    name: 'Search',
    icon: 'search',
    children: [
      { name: 'Users', href: '/repositories', icon: 'repositories' },
      { name: 'Content', href: '/search', icon: 'document' },
    ],
  },
  {
    name: 'Ctrl Panel',
    icon: 'command',
    onClick:
      ({ kbar }) =>
      () =>
        kbar.query.toggle(),
  },
  {
    name: 'Configure',
    href: '/configure',
    icon: 'configure',
  },
]

export function isCurrent(
  currentPathname: string,
  item: SidebarNavItem | SidebarNavChild,
): boolean {
  if ('children' in item) {
    return item.children.some((child) => isCurrent(currentPathname, child))
  }
  if (!('href' in item)) return false
  if (item.href === '/') {
    return currentPathname === item.href
  }
  return (
    currentPathname === item.href || currentPathname.startsWith(`${item.href}/`)
  )
}
