import { Dropdown } from '@/common/Dropdown'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'
import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { PostAsCard } from '@/common/posts/PostsFeed'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { ProfileCard } from '@/repositories/AccountView'
import { WorkspacePanel } from '@/workspace/Panel'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import {
  isActorData,
  SearchContentSection,
  useContentSearch,
} from 'components/search-content/useContentSearch'
import { SectionHeader } from 'components/SectionHeader'
import { useSearchParams } from 'next/navigation'
import { useTitle } from 'react-use'

const TABS = [
  {
    key: 'top',
    name: 'Top',
    href: `/search?section=top`,
  },
  {
    key: 'latest',
    name: 'Latest',
    href: `/search?section=latest`,
  },
  {
    key: 'people',
    name: 'People',
    href: `/search?section=people`,
  },
]

export const SearchPageContent = () => {
  const searchParams = useSearchParams()
  const term = searchParams.get('term') ?? ''
  const section = (searchParams.get('section') ?? 'top') as SearchContentSection

  let pageTitle = `Search Content`
  if (term) {
    pageTitle += ` - ${term}`
  }

  useTitle(pageTitle)
  const { data, isLoading, fetchNextPage, hasNextPage, addToWorkspace } =
    useContentSearch({
      term,
      section,
    })
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const workspaceOptions = [
    {
      id: 'add_users_to_workspace',
      text: section === 'people' ? 'Add all people' : 'Add all posters',
      onClick: () => {
        if (isActorData(data)) {
          addToWorkspace(data.map((item) => item.did))
        } else {
          addToWorkspace(data.map((item) => item.author.did))
        }
      },
    },
  ]

  if (section !== 'people') {
    workspaceOptions.push({
      id: 'add_posts_to_workspace',
      text: 'Add all posts',
      onClick: () => {
        if (!isActorData(data)) {
          addToWorkspace(data.map((item) => item.uri))
        }
      },
    })
  }

  return (
    <>
      <SectionHeader title={'Search'} tabs={TABS} current={section}>
        <div className="flex-1 lg:text-right lg:pr-2 pb-4 px-1 pt-5 lg:pt-0">
          <Dropdown
            containerClassName="inline-block"
            rightAligned
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-400 bg-white dark:bg-slate-800 dark:text-gray-100 dark px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
            items={workspaceOptions}
          >
            Add to workspace
          </Dropdown>
        </div>
      </SectionHeader>
      {!term ? (
        <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
          <EmptyDataset message="Please input a keyword on the top search bar">
            <MagnifyingGlassIcon className="h-10 w-10" />
          </EmptyDataset>
        </div>
      ) : (
        <div className="mx-auto">
          {isLoading && <Loading />}
          {isActorData(data) ? (
            <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.map((item) => {
                return <ProfileCard profile={item} key={item.did} />
              })}
            </div>
          ) : (
            <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
              {data.map((item) => {
                return (
                  <div className="mb-4" key={item.uri}>
                    <PostAsCard
                      className="bg-transparent px-3 py-2"
                      item={{ post: item }}
                      dense
                    />
                  </div>
                )
              })}
            </div>
          )}
          {hasNextPage && (
            <div className="flex justify-center mb-4">
              <LoadMoreButton onClick={() => fetchNextPage()} />
            </div>
          )}
        </div>
      )}

      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </>
  )
}
