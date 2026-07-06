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
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { useKBar } from 'kbar'
import { MouseEventHandler, useMemo } from 'react'

import { useIsImageSearchEnabled } from '@/lib/useImageSearch'

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
  photo: PhotoIcon,
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

export function useNavItems(): SidebarNavItem[] {
  const imageSearchEnabled = useIsImageSearchEnabled()
  return useMemo(() => {
    if (!imageSearchEnabled) return NAV_ITEMS
    return NAV_ITEMS.map((item) =>
      'children' in item && item.name === 'Search'
        ? {
            ...item,
            children: [
              ...item.children,
              { name: 'Images', href: '/image-search', icon: 'photo' },
            ],
          }
        : item,
    )
  }, [imageSearchEnabled])
}

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
