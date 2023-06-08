'use client'
import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { SidebarNav } from './SidebarNav'
import { MobileMenuProvider, MobileMenu, MobileMenuBtn } from './MobileMenu'
import { ProfileMenu } from './ProfileMenu'
import { LoginModal } from './LoginModal'

import { useCommandPaletteAsyncSearch } from './CommandPalette/useAsyncSearch'
import { useSyncedState } from '@/lib/useSyncedState'

export function Shell({ children }: React.PropsWithChildren) {
  useCommandPaletteAsyncSearch()

  return (
    <MobileMenuProvider>
      <LoginModal />
      <div className="flex h-full">
        {/* Narrow sidebar */}
        <div className="hidden w-28 overflow-y-auto bg-rose-700 md:block">
          <div className="flex w-full flex-col items-center py-6">
            <div className="flex flex-shrink-0 items-center">
              <img
                className="h-8 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=white"
                alt="Bluesky Admin"
              />
            </div>
            <SidebarNav />
          </div>
        </div>

        {/* Mobile menu */}
        <MobileMenu />

        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="w-full">
            <div className="relative z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white">
              <MobileMenuBtn />
              <div className="flex flex-1 justify-between px-4 sm:px-6">
                <div className="flex flex-1">
                  <form className="flex w-full md:ml-0" action="#" method="GET">
                    <label htmlFor="search-field" className="sr-only">
                      Search
                    </label>
                    <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                        <MagnifyingGlassIcon
                          className="h-5 w-5 flex-shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                      <SearchInput />
                    </div>
                  </form>
                </div>
                <div className="ml-2 flex items-center space-x-4 sm:ml-6 sm:space-x-6">
                  {/* Profile dropdown */}
                  <ProfileMenu />
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <div className="flex flex-1 items-stretch overflow-hidden">
            <main className="flex-1 overflow-y-auto">
              {/* Primary column */}
              <section
                aria-labelledby="primary-heading"
                className="flex h-full min-w-0 flex-1 flex-col lg:order-last"
              >
                {children}
              </section>
            </main>
          </div>
        </div>
      </div>
    </MobileMenuProvider>
  )
}

function SearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  // Input state for term, synced with params
  const termParam = params.get('term') ?? ''
  const [termInput, setTermInput] = useSyncedState(termParam)

  const updateParams = useCallback(
    (s: string) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set('term', s)
      router.push((pathname ?? '') + '?' + nextParams.toString())
    },
    [params, pathname, router],
  )

  return (
    <input
      id="term"
      name="term"
      className="h-full w-full border-transparent py-2 pl-8 pr-3 text-base text-gray-900 placeholder-gray-500 focus:border-transparent focus:placeholder-gray-400 focus:outline-none focus:ring-0"
      placeholder="Search"
      type="search"
      value={termInput}
      onChange={(ev) => {
        setTermInput(ev.target.value)
        updateParams(ev.target.value)
      }}
    />
  )
}
