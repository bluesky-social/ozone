import { Fragment, type JSX } from 'react'
import { Menu, MenuItems, MenuItem, MenuButton } from '@headlessui/react'

import { classNames } from '@/lib/util'

export type DropdownItem = {
  id?: string
  group?: string
  disabled?: boolean
  title?: string
  onClick: () => void
  text: string | JSX.Element
}

export const Dropdown = ({
  rightAligned,
  className,
  children,
  items,
  containerClassName,
  describedBy,
  disabled,
  ...rest
}: {
  describedBy?: string
  disabled?: boolean
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
          <MenuButton
            type="button"
            aria-describedby={describedBy}
            disabled={disabled}
            className={className}
          >
            {children}
          </MenuButton>
        </div>
        {/* z-50 value is important because we want all dropdowns to draw over other elements in the page and besides mobile menu, z-40 is the highest z-index we use in this codebase */}
        <MenuItems
          className={classNames(
            rightAligned ? 'right-0' : '',
            'absolute z-50 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-slate-800 py-1 shadow-lg dark:shadow-slate-900 ring-1 ring-black ring-opacity-5 focus:outline-none',
          )}
        >
          {items.map((item, index) => (
            <Fragment key={item.id || String(item.text)}>
              {item.group && item.group !== items[index - 1]?.group && (
                <div className="px-4 pt-2 text-xs font-semibold text-gray-500">
                  {item.group}
                </div>
              )}
              <MenuItem disabled={item.disabled}>
                {({ focus, close }) => (
                  <a
                    href="#"
                    aria-disabled={item.disabled}
                    title={item.title}
                    className={classNames(
                      focus ? 'bg-gray-100 dark:bg-slate-700' : '',
                      'block w-full text-left aria-disabled:opacity-50 px-4 py-2 text-sm text-gray-700 dark:text-gray-100',
                    )}
                    onClick={(event) => {
                      event.preventDefault()
                      if (!item.disabled) {
                        item.onClick()
                        close()
                      }
                    }}
                  >
                    {item.text}
                  </a>
                )}
              </MenuItem>
            </Fragment>
          ))}
        </MenuItems>
      </Menu>
    </>
  )
}
