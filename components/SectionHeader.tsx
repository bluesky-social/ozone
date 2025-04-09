import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ReactNode, type JSX } from 'react'
import { classNames } from '@/lib/util'

interface Tab {
  key: string
  name: string
  href: string
}

export function SectionHeader({
  title,
  tabs,
  current,
  children,
}: {
  title: string | JSX.Element
  tabs: Tab[]
  current: string
  children?: ReactNode
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <div
      className={`px-6 pt-4 ${!!tabs.length ? 'border-b border-gray-200' : ''}`}
    >
      <div className="sm:flex sm:items-baseline">
        {typeof title === 'string' ? (
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
            {title}
          </h3>
        ) : (
          title
        )}
        <div className="mt-4 sm:mt-0 sm:ml-10 flex-1">
          <nav className="-mb-px flex flex-wrap">
            <div className="space-x-8 w-full lg:w-2/3">
              {tabs.map((tab) => {
                const url = new URL(tab.href, 'http://x')
                let href: string = ''
                if (pathname !== url.pathname || tab.href === '/reports') {
                  href = tab.href
                } else {
                  // Preserve query params when on same page
                  const nextParams = new URLSearchParams(params)
                  url.searchParams.forEach((val, key) => {
                    nextParams.set(key, val)
                  })
                  href = url.pathname + '?' + nextParams.toString()
                }
                return (
                  <Link
                    prefetch={false}
                    key={tab.name}
                    href={href}
                    className={classNames(
                      current === tab.key
                        ? 'border-rose-500 text-rose-600 dark:border-teal-400 dark:text-teal-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-100 dark:hover:text-teal-200 hover:border-gray-300 dark:hover:border-teal-300',
                      'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm',
                    )}
                    aria-current={current ? 'page' : undefined}
                  >
                    {tab.name}
                  </Link>
                )
              })}
            </div>
            {children}
          </nav>
        </div>
      </div>
    </div>
  )
}
