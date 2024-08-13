'use client'
import { Menu, Transition } from '@headlessui/react'
import { Fragment, SyntheticEvent } from 'react'

import { classNames } from '@/lib/util'
import {
  useAuthContext,
  useAuthIdentifier,
  useAuthProfile,
} from './AuthContext'

export function ProfileMenu() {
  const { pdsAgent, signOut } = useAuthContext()

  const identifier = useAuthIdentifier()
  const avatar = useAuthProfile()?.avatar

  const onClickSignout = async (e: SyntheticEvent) => {
    e.preventDefault()
    await signOut()
    window.location.reload()
  }

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative flex-shrink-0">
        <div>
          <Menu.Button className="flex rounded-full bg-white dark:bg-slate-900 text-sm items-center focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">
            <span className="sr-only">Open user menu</span>
            <span className="hidden md:inline mr-2 font-semibold text-base text-gray-600 dark:text-gray-100">
              {identifier || ''}
            </span>
            <img
              className="h-10 w-10 rounded-full"
              src={avatar || '/img/default-avatar.jpg'}
              alt=""
            />
          </Menu.Button>
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
          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-slate-900 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="#"
                  className={classNames(
                    active ? 'bg-gray-100 dark:bg-slate-500' : '',
                    'block px-4 py-2 text-sm text-gray-700 dark:text-gray-100',
                  )}
                  onClick={onClickSignout}
                >
                  Sign out
                </a>
              )}
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  )
}
