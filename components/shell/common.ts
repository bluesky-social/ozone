import {
  ExclamationCircleIcon,
  UserGroupIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

export const ICONS = {
  reports: ExclamationCircleIcon,
  actions: BoltIcon,
  repositories: UserGroupIcon,
}

export interface SidebarNavItem {
  name: string
  href: string
  icon: keyof typeof ICONS
}

export const NAV_ITEMS: SidebarNavItem[] = [
  { name: 'Reports', href: '/reports', icon: 'reports' },
  { name: 'Repositories', href: '/repositories', icon: 'repositories' },
]

export function isCurrent(
  currentPathname: string,
  item: SidebarNavItem,
): boolean {
  if (item.href === '/') {
    return currentPathname === item.href
  }
  return (
    currentPathname === item.href || currentPathname.startsWith(`${item.href}/`)
  )
}
