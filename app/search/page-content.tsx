import { Dropdown } from '@/common/Dropdown'
import { Loading } from '@/common/Loader'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { PostAsCard } from '@/common/posts/PostsFeed'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { WorkspacePanel } from '@/workspace/Panel'
import { useContentSearch } from 'components/search-content/useContentSearch'
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
]

export const SearchPageContent = () => {
  const searchParams = useSearchParams()
  const term = searchParams.get('term') ?? ''
  const section = searchParams.get('section') ?? 'top'

  let pageTitle = `Search Content`
  if (term) {
    pageTitle += ` - ${term}`
  }

  useTitle(pageTitle)
  const { posts, isLoading, fetchNextPage, hasNextPage, addToWorkspace } =
    useContentSearch({
      term,
      section,
    })
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  return (
    <>
      <SectionHeader title={'Search'} tabs={TABS} current={section}>
        <div className="flex-1 lg:text-right lg:pr-2 pb-4 px-1 pt-5 lg:pt-0">
          <Dropdown
            containerClassName="inline-block"
            rightAligned
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-400 bg-white dark:bg-slate-800 dark:text-gray-100 dark px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
            items={[
              {
                id: 'add_users_to_workspace',
                text: 'Add all posters',
                onClick: () =>
                  addToWorkspace(posts.map((post) => post.author.did)),
              },
              {
                id: 'add_posts_to_workspace',
                text: 'Add all posts',
                onClick: () => addToWorkspace(posts.map((post) => post.uri)),
              },
            ]}
          >
            Add to workspace
          </Dropdown>
        </div>
      </SectionHeader>

      <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
        {isLoading && <Loading />}
        {posts.map((post) => (
          <div className="mb-4" key={post.uri}>
            <PostAsCard
              className="bg-transparent px-3 py-2"
              item={{ post }}
              dense
            />
          </div>
        ))}
        {hasNextPage && (
          <div className="flex justify-center mb-4">
            <LoadMoreButton onClick={() => fetchNextPage()} />
          </div>
        )}
      </div>

      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </>
  )
}
