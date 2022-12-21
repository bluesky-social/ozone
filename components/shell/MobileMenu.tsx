'use client'

import { Fragment, createContext, useContext, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import { Bars3BottomLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { classNames } from '../../lib/util'
import { ICONS, NAV_ITEMS, isCurrent } from './common'

interface MobileMenuOpen {
  open: boolean
  set: (v: boolean) => void
}
const MobileMenuOpenCtx = createContext<MobileMenuOpen>({
  open: false,
  set: (v: boolean) => {},
})

export function MobileMenuProvider({ children }: React.PropsWithChildren) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const value = { open: mobileMenuOpen, set: setMobileMenuOpen }
  return (
    <MobileMenuOpenCtx.Provider value={value}>
      {children}
    </MobileMenuOpenCtx.Provider>
  )
}

export function MobileMenuBtn() {
  const mobileMenuOpen = useContext(MobileMenuOpenCtx)
  return (
    <button
      type="button"
      className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500 md:hidden"
      onClick={() => mobileMenuOpen.set(true)}
    >
      <span className="sr-only">Open sidebar</span>
      <Bars3BottomLeftIcon className="h-6 w-6" aria-hidden="true" />
    </button>
  )
}

export function MobileMenu() {
  const pathname = usePathname() || '/'
  const mobileMenuOpen = useContext(MobileMenuOpenCtx)
  return (
    <>
      {/* Mobile menu */}
      <Transition.Root show={mobileMenuOpen.open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-20 md:hidden"
          onClose={mobileMenuOpen.set}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-rose-700 pt-5 pb-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-1 right-0 -mr-14 p-1">
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                      onClick={() => mobileMenuOpen.set(false)}
                    >
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Close sidebar</span>
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex flex-shrink-0 items-center px-4">
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/mark.svg?color=white"
                    alt="Your Company"
                  />
                </div>
                <div className="mt-5 h-0 flex-1 overflow-y-auto px-2">
                  <nav className="flex h-full flex-col">
                    <div className="space-y-1">
                      {NAV_ITEMS.map((item) => {
                        const Icon = ICONS[item.icon]
                        return (
                          <a
                            key={item.name}
                            href={item.href}
                            className={classNames(
                              isCurrent(pathname, item)
                                ? 'bg-rose-800 text-white'
                                : 'text-rose-100 hover:bg-rose-800 hover:text-white',
                              'group py-2 px-3 rounded-md flex items-center text-sm font-medium'
                            )}
                            aria-current={
                              isCurrent(pathname, item) ? 'page' : undefined
                            }
                          >
                            <Icon
                              className={classNames(
                                isCurrent(pathname, item)
                                  ? 'text-white'
                                  : 'text-rose-300 group-hover:text-white',
                                'mr-3 h-6 w-6'
                              )}
                              aria-hidden="true"
                            />
                            <span>{item.name}</span>
                          </a>
                        )
                      })}
                    </div>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}
