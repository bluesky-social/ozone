'use client'
import {
  Menu,
  Transition,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react'
import {
  CheckCircleIcon,
  ClockIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Fragment, SyntheticEvent } from 'react'

import { classNames } from '@/lib/util'
import { useColorScheme } from '@/common/useColorScheme'
import {
  useAuthContext,
  useAuthIdentifier,
  useAuthProfile,
} from './AuthContext'
import { useServerConfig } from './ConfigurationContext'

export function ProfileMenu() {
  const { signOut } = useAuthContext()
  const { theme, toggleTheme } = useColorScheme()
  const { verifierDid } = useServerConfig()

  const identifier = useAuthIdentifier()
  const avatar = useAuthProfile()?.avatar

  const onClickSignout = async (e: SyntheticEvent) => {
    e.preventDefault()
    await signOut()
    window.location.reload()
  }

  const itemClass = (focus: boolean) =>
    classNames(
      focus ? 'bg-gray-100 dark:bg-slate-500' : '',
      'flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-100',
    )

  const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon
  const themeLabel = theme === 'dark' ? 'Switch to light' : 'Switch to dark'

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative flex-shrink-0">
        <div>
          <MenuButton className="flex rounded-full bg-white dark:bg-slate-900 text-sm items-center focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">
            <span className="sr-only">Open user menu</span>
            <span className="hidden md:inline mr-2 font-semibold text-base text-gray-600 dark:text-gray-100">
              {identifier || ''}
            </span>
            <img
              className="h-10 w-10 rounded-full"
              src={avatar || '/img/default-avatar.jpg'}
              alt=""
            />
          </MenuButton>
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
          <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-slate-900 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <MenuItem>
              {({ focus }) => (
                <button
                  type="button"
                  className={classNames(itemClass(focus), 'w-full text-left')}
                  onClick={(e) => {
                    e.preventDefault()
                    toggleTheme()
                  }}
                >
                  <ThemeIcon className="h-5 w-5" aria-hidden="true" />
                  {themeLabel}
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ focus }) => (
                <Link href="/scheduled-actions" className={itemClass(focus)}>
                  <ClockIcon className="h-5 w-5" aria-hidden="true" />
                  Schedule
                </Link>
              )}
            </MenuItem>
            {verifierDid && (
              <MenuItem>
                {({ focus }) => (
                  <Link href="/verification" className={itemClass(focus)}>
                    <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                    Verification
                  </Link>
                )}
              </MenuItem>
            )}
            <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
            <MenuItem>
              {({ focus }) => (
                <a
                  href="#"
                  className={classNames(
                    focus ? 'bg-gray-100 dark:bg-slate-500' : '',
                    'block px-4 py-2 text-sm text-gray-700 dark:text-gray-100',
                  )}
                  onClick={onClickSignout}
                >
                  Sign out
                </a>
              )}
            </MenuItem>
          </MenuItems>
        </Transition>
      </Menu>
    </>
  )
}
