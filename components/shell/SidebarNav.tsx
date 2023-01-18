'use client'

import Link from 'next/link'
import { ICONS, NAV_ITEMS, isCurrent } from './common'
import { classNames } from '../../lib/util'
import { usePathname } from 'next/navigation'

export function SidebarNav() {
  const pathname = usePathname() || '/'
  return (
    <div className="mt-6 w-full flex-1 space-y-1 px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon]
        return (
          <Link
            key={item.name}
            href={item.href}
            className={classNames(
              isCurrent(pathname, item)
                ? 'bg-rose-800 text-white'
                : 'text-rose-100 hover:bg-rose-800 hover:text-white',
              'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium',
            )}
            aria-current={isCurrent(pathname, item) ? 'page' : undefined}
          >
            <Icon
              className={classNames(
                isCurrent(pathname, item)
                  ? 'text-white'
                  : 'text-rose-300 group-hover:text-white',
                'h-6 w-6',
              )}
              aria-hidden="true"
            />
            <span className="mt-2">{item.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
