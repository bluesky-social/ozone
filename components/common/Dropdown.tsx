import { Fragment } from 'react'
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
      <Menu as="div" className={`relative flex-shrink-0 ${containerClassName || ''}`}>
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
          {/* TODO: This needs to be checked, right-0 may be needed elsewhere */}
          <Menu.Items
            className={classNames(
              rightAligned ? 'right-0' : '',
              'absolute z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
            )}
          >
            {items.map((item) => (
              <Menu.Item key={item.id || String(item.text)}>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? 'bg-gray-100' : '',
                      'block px-4 py-2 text-sm text-gray-700',
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
