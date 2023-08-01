import {
  ExclamationCircleIcon,
  UserGroupIcon,
  BoltIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { useKBar } from 'kbar'
import { MouseEventHandler } from 'react'

export const ICONS = {
  reports: ExclamationCircleIcon,
  actions: BoltIcon,
  repositories: UserGroupIcon,
  command: CommandLineIcon,
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
      }) => MouseEventHandler<HTMLButtonElement> | undefined
    }
)

export const NAV_ITEMS: SidebarNavItem[] = [
  { name: 'Reports', href: '/reports', icon: 'reports' },
  { name: 'Repositories', href: '/repositories', icon: 'repositories' },
  {
    name: 'Ctrl Panel',
    icon: 'command',
    onClick:
      ({ kbar }) =>
      () =>
        kbar.query.toggle(),
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
