import {
  CogIcon,
  HomeIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

export const ICONS = {
  home: HomeIcon,
  reports: ExclamationCircleIcon,
  accounts: UserGroupIcon,
  settings: CogIcon,
}

export interface SidebarNavItem {
  name: string
  href: string
  icon: keyof typeof ICONS
}

export const NAV_ITEMS: SidebarNavItem[] = [
  { name: 'Home', href: '/', icon: 'home' },
  {
    name: 'Reports',
    href: '/reports',
    icon: 'reports',
  },
  { name: 'Accounts', href: '/accounts', icon: 'accounts' },
  { name: 'Settings', href: '/settings', icon: 'settings' },
]

export function isCurrent(
  currentPathname: string,
  item: SidebarNavItem
): boolean {
  if (item.href === '/') {
    return currentPathname === item.href
  }
  return currentPathname === item.href || currentPathname.startsWith(item.href)
}
