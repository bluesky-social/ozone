import { ICONS } from './common'
export interface SidebarNavItem {
  name: string
  href: string
  icon: keyof typeof ICONS
  current: boolean
}
