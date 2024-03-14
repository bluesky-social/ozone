'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useKBar } from 'kbar'
import { classNames } from '@/lib/util'
import { useSession } from '@/lib/useSession'
import { ICONS, NAV_ITEMS, isCurrent } from './common'

export function SidebarNav({ theme, toggleTheme }) {
  const kbar = useKBar()
  const pathname = usePathname() || '/'
  const session = useSession()
  const isServiceAccount = !!session && session.did === session.config.did
  return (
    <div className="mt-6 w-full flex-1 space-y-1 px-2">
      {NAV_ITEMS.map((item) => {
        if (item.serviceAccountOnly && !isServiceAccount) {
          return
        }
        let iconName = item.icon
        if (iconName === 'sun' && theme === 'dark') {
          iconName = 'moon'
        }
        const Icon = ICONS[iconName]

        const children = (
          <>
            <Icon
              className={classNames(
                isCurrent(pathname, item)
                  ? 'text-white'
                  : 'text-rose-300 dark:text-gray-100 group-hover:text-white',
                'h-6 w-6',
              )}
              aria-hidden="true"
            />
            <span className="mt-2">{item.name}</span>
          </>
        )
        const itemClassNames = classNames(
          isCurrent(pathname, item)
            ? 'bg-rose-800 dark:bg-teal-700 text-white'
            : 'text-rose-100 dark:text-teal-100 hover:bg-rose-800 dark:hover:bg-teal-700 hover:text-white',
          'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium',
        )
        if ('href' in item) {
          return (
            <Link
              key={item.name}
              href={item.href}
              className={itemClassNames}
              aria-current={isCurrent(pathname, item) ? 'page' : undefined}
            >
              {children}
            </Link>
          )
        }

        return (
          <button
            key={item.name}
            className={itemClassNames}
            onClick={item.onClick({ kbar, toggleTheme })}
          >
            {children}
          </button>
        )
      })}
    </div>
  )
}
