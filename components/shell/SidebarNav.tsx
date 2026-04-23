'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useKBar } from 'kbar'
import { classNames } from '@/lib/util'
import { ICONS, NAV_ITEMS, SidebarNavChild, isCurrent } from './common'
import { useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export function SidebarNav() {
  const kbar = useKBar()
  const pathname = usePathname() || '/'

  const autoExpanded = useMemo(() => {
    const set = new Set<string>()
    for (const item of NAV_ITEMS) {
      if ('children' in item && isCurrent(pathname, item)) {
        set.add(item.name)
      }
    }
    return set
  }, [pathname])

  const [manuallyToggled, setManuallyToggled] = useState<
    Record<string, boolean>
  >({})

  const isExpanded = (name: string) =>
    name in manuallyToggled ? manuallyToggled[name] : autoExpanded.has(name)

  const renderChildCell = (child: SidebarNavChild) => {
    const Icon = ICONS[child.icon]
    const active = isCurrent(pathname, child)
    return (
      <Link
        key={child.name}
        href={child.href}
        className={classNames(
          active
            ? 'bg-rose-800 dark:bg-teal-700 text-white'
            : 'text-rose-100 dark:text-teal-100 hover:bg-rose-800 dark:hover:bg-teal-700 hover:text-white',
          'group w-full py-2 px-1 rounded-md flex flex-col items-center text-[11px] font-medium',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon
          className={classNames(
            active
              ? 'text-white'
              : 'text-rose-300 dark:text-gray-100 group-hover:text-white',
            'h-5 w-5',
          )}
          aria-hidden="true"
        />
        <span className="mt-1">{child.name}</span>
      </Link>
    )
  }

  return (
    <div className="mt-6 w-full flex-1 space-y-1 px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon]
        const active = isCurrent(pathname, item)

        const itemClassNames = classNames(
          active
            ? 'bg-rose-800 dark:bg-teal-700 text-white'
            : 'text-rose-100 dark:text-teal-100 hover:bg-rose-800 dark:hover:bg-teal-700 hover:text-white',
          'group w-full p-3 rounded-md flex flex-col items-center text-xs font-medium',
        )

        const iconEl = (
          <span className="relative">
            <Icon
              className={classNames(
                active
                  ? 'text-white'
                  : 'text-rose-300 dark:text-gray-100 group-hover:text-white',
                'h-6 w-6',
              )}
              aria-hidden="true"
            />
            {item.badge && (
              <span className="absolute -top-1.5 -right-3 rounded-full bg-yellow-400 px-1 py-px text-[9px] font-semibold uppercase leading-none text-yellow-900">
                {item.badge}
              </span>
            )}
          </span>
        )

        if ('children' in item) {
          const expanded = isExpanded(item.name)
          const Chevron = expanded ? ChevronDownIcon : ChevronRightIcon
          return (
            <div key={item.name}>
              <button
                className={itemClassNames}
                onClick={() =>
                  setManuallyToggled((prev) => ({
                    ...prev,
                    [item.name]: !expanded,
                  }))
                }
                aria-expanded={expanded}
              >
                {iconEl}
                <span className="mt-2 flex items-center gap-0.5">
                  {item.name}
                  <Chevron className="h-3 w-3" aria-hidden="true" />
                </span>
              </button>
              {expanded && (
                <div className="mt-1 space-y-1">
                  {item.children.map(renderChildCell)}
                </div>
              )}
            </div>
          )
        }

        const children = (
          <>
            {iconEl}
            <span className="mt-2">{item.name}</span>
          </>
        )

        if ('href' in item) {
          return (
            <Link
              key={item.name}
              href={item.href}
              className={itemClassNames}
              aria-current={active ? 'page' : undefined}
            >
              {children}
            </Link>
          )
        }

        return (
          <button
            key={item.name}
            className={itemClassNames}
            onClick={item.onClick({ kbar })}
          >
            {children}
          </button>
        )
      })}
    </div>
  )
}
