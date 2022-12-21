'use client'
import { useState } from 'react'
import { LockClosedIcon } from '@heroicons/react/20/solid'

export function LoginModal() {
  const [isAuthed, setIsAuthed] = useState(
    localStorage.debugIsAuthed ? true : false
  )
  const onClickSignin = () => {
    // TODO
    localStorage.debugIsAuthed = 1
    setIsAuthed(true)
  }

  if (isAuthed) {
    return <></>
  }
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-rose-600 to-rose-800">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
          <div>
            <img
              className="mx-auto h-12 w-auto"
              src="https://tailwindui.com/img/logos/mark.svg?color=rose&shade=600"
              alt="Your Company"
            />
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Bluesky Admin Tools
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign into your account
            </p>
          </div>
          <form className="mt-8 space-y-6" action="#" method="POST">
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label htmlFor="account-handle" className="sr-only">
                  Account handle
                </label>
                <input
                  id="account-handle"
                  name="handle"
                  type="handle"
                  autoComplete="handle"
                  required
                  className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                  placeholder="Account handle"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-rose-600 py-2 px-4 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                onClick={onClickSignin}
              >
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <LockClosedIcon
                    className="h-5 w-5 text-rose-500 group-hover:text-rose-400"
                    aria-hidden="true"
                  />
                </span>
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
