import {
  ExclamationCircleIcon,
  UserGroupIcon,
  BoltIcon,
  QueueListIcon,
  CommandLineIcon,
  SunIcon,
  MoonIcon,
  WrenchScrewdriverIcon,
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
}

export type SidebarNavItem = {
  name: string
  icon: keyof typeof ICONS
  serviceAccountOnly?: boolean
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
  { name: 'Events', href: '/events', icon: 'events' },
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
    name: 'Theme',
    icon: 'sun',
    onClick: ({ toggleTheme }) => toggleTheme,
  },
  {
    name: 'Configure',
    href: '/configure',
    icon: 'configure',
    serviceAccountOnly: true,
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
