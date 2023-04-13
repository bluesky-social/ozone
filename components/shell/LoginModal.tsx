'use client'
import { FormEvent, useState, useEffect } from 'react'
import { LockClosedIcon, XCircleIcon } from '@heroicons/react/20/solid'
import Client from '../../lib/client'

export function LoginModal() {
  const [isAuthed, setIsAuthed] = useState(true) // immediately corrected in useEffect below
  const [error, setError] = useState('')
  const [service, setService] = useState('https://bsky.social')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [adminToken, setAdminToken] = useState('')

  useEffect(() => {
    if (!Client.hasSetup) {
      Client.setup().then(() => setIsAuthed(Client.isAuthed))
    }
  }, [])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await Client.signin(service, handle, password, adminToken)
      setIsAuthed(Client.isAuthed)
    } catch (e: any) {
      console.error(e)
      setError(e.toString())
    }
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
          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label htmlFor="service-url" className="sr-only">
                  Service
                </label>
                <input
                  id="service-url"
                  name="service"
                  type="text"
                  required
                  className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                  placeholder="Service URL"
                  list="service-url-suggestions"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
                <datalist id="service-url-suggestions">
                  <option value="https://bsky.social" />
                  <option value="https://staging.bsky.dev" />
                </datalist>
              </div>
              <div>
                <label htmlFor="account-handle" className="sr-only">
                  Account handle
                </label>
                <input
                  id="account-handle"
                  name="handle"
                  type="text"
                  required
                  className="relative block w-full appearance-none rounded-none border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                  placeholder="Account handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
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
                  className="relative block w-full appearance-none rounded-none border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Admin Token
                </label>
                <input
                  id="admin-token"
                  name="admin-token"
                  type="password"
                  required
                  className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                  placeholder="Admin Token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircleIcon
                      className="h-5 w-5 text-red-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            ) : undefined}

            <div>
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-rose-600 py-2 px-4 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
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
