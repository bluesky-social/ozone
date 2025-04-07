import { Fragment, type JSX } from 'react';
import { Menu, Transition } from '@headlessui/react'

import { classNames } from '@/lib/util'

export type DropdownItem = {
  id?: string
  onClick: () => void
  text: string | JSX.Element
}

export const Dropdown = ({
  rightAligned,
  className,
  children,
  items,
  containerClassName,
  ...rest
}: {
  containerClassName?: string
  rightAligned?: boolean
  items: DropdownItem[]
  children: React.ReactNode
  className?: string
}) => {
  return (
    <>
      {/* Profile dropdown */}
      <Menu
        as="div"
        className={`relative flex-shrink-0 ${containerClassName || ''}`}
        {...rest}
      >
        <div>
          <Menu.Button className={className}>{children}</Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          {/* z-50 value is important because we want all dropdowns to draw over other elements in the page and besides mobile menu, z-40 is the highest z-index we use in this codebase */}
          <Menu.Items
            className={classNames(
              rightAligned ? 'right-0' : '',
              'absolute z-50 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-slate-800 py-1 shadow-lg dark:shadow-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none',
            )}
          >
            {items.map((item) => (
              <Menu.Item key={item.id || String(item.text)}>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? 'bg-gray-100 dark:bg-slate-700' : '',
                      'block px-4 py-2 text-sm text-gray-700 dark:text-gray-100',
                    )}
                    onClick={item.onClick}
                  >
                    {item.text}
                  </a>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  )
}
