'use client'
import {
  useEffect,
  useState,
  SyntheticEvent,
  Fragment,
  useContext,
} from 'react'
import { Menu, Transition } from '@headlessui/react'
import { classNames } from '@/lib/util'
import Client from '@/lib/client'
import { AuthChangeContext, AuthContext, AuthState } from './AuthContext'

export function ProfileMenu() {
  const { isLoggedIn } = useContext(AuthContext)
  const setAuthContextData = useContext(AuthChangeContext)
  const [handle, setHandle] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')

  useEffect(() => {
    const onClientChange = () =>
      setAuthContextData(
        Client.isAuthed ? AuthState.LoggedIn : AuthState.LoggedOut,
      )
    Client.addEventListener('change', onClientChange)
    return () => Client.removeEventListener('change', onClientChange)
  }, [])

  useEffect(() => {
    let aborted = false
    if (!Client.isAuthed) {
      localStorage.cachedProfileHandle = ''
      localStorage.cachedProfileAvatar = ''
      setHandle('')
      setAvatar('')
      return
    }
    if (
      Client.session.handle === localStorage.cachedProfileHandle &&
      localStorage.cachedProfileAvatar
    ) {
      setHandle(localStorage.cachedProfileHandle)
      setAvatar(localStorage.cachedProfileAvatar)
      return
    }
    Client.api.app.bsky.actor.getProfile({ actor: Client.session.did }).then(
      (res) => {
        localStorage.cachedProfileHandle = res.data.handle
        localStorage.cachedProfileAvatar = res.data.avatar || ''
        setHandle(res.data.handle)
        setAvatar(res.data.avatar || '')
      },
      (err) => {
        console.error('Failed to fetch user profile', err)
      },
    )
    return () => {
      aborted = true
    }
  }, [isLoggedIn])

  const onClickSignout = (e: SyntheticEvent) => {
    e.preventDefault()
    Client.signout()
    window.location.reload()
  }

  return (
    <>
      {/* Profile dropdown */}
      <Menu as="div" className="relative flex-shrink-0">
        <div>
          <Menu.Button className="flex rounded-full bg-white text-sm items-center focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">
            <span className="sr-only">Open user menu</span>
            <span className="hidden md:inline mr-2 font-semibold text-base text-gray-600">
              {handle || ''}
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
          <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="#"
                  className={classNames(
                    active ? 'bg-gray-100' : '',
                    'block px-4 py-2 text-sm text-gray-700',
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
