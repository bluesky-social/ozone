import { classNames } from '../lib/util'

interface Tab {
  key: string
  name: string
  href: string
}

export function SectionHeader({
  title,
  tabs,
  current,
}: {
  title: string
  tabs: Tab[]
  current: string
}) {
  return (
    <div className="border-b border-gray-200 px-6 pt-4">
      <div className="sm:flex sm:items-baseline">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
        <div className="mt-4 sm:mt-0 sm:ml-10">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.name}
                href={tab.href}
                className={classNames(
                  current === tab.key
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm'
                )}
                aria-current={tab.current ? 'page' : undefined}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
