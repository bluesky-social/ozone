import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
} from 'kbar'
import React from 'react'
import { getStaticActions } from './actions'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { CommandPaletteResultItem } from './ResultItem'

const SearchResults = () => {
  const { results, rootActionId } = useMatches()

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        // These are usually section headers
        if (typeof item === 'string') {
          return (
            <div className="px-4 pt-4 pb-2 font-medium text-gray-400 uppercase ">
              {item}
            </div>
          )
        }
        return (
          <CommandPaletteResultItem
            action={item}
            active={active}
            currentRootActionId={rootActionId}
          />
        )
      }}
    />
  )
}

export const CommandPaletteRoot = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const router = useRouter()
  const staticActions = getStaticActions({ router })
  return (
    <KBarProvider actions={staticActions}>
      <KBarPortal>
        {/* z-50 value is important because we want the cmd palette to be able above all panels and currently, the highest z-index we use is z-50 */}
        <KBarPositioner className="p-2 bg-gray-900/80 flex items-center pb-4 z-50">
          <KBarAnimator className="w-full md:w-2/3 lg:w-1/2 w-max-[600px] overflow-hidden p-2 bg-white dark:bg-slate-800 rounded-xl">
            <KBarSearch
              defaultPlaceholder="Search by DID, bsky url or handle"
              className="flex px-4 w-full h-16 outline-none dark:bg-slate-800 dark:text-gray-100"
            />
            <SearchResults />
            <div className="pb-3" />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  )
}
