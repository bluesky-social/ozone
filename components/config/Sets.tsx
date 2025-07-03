import { LinkButton } from '@/common/buttons'
import { Input } from '@/common/forms'
import { useSyncedState } from '@/lib/useSyncedState'
import { SetEditor } from '@/sets/SetEditor'
import { SetList } from '@/sets/SetList'
import { SetView } from '@/sets/SetView'
import { useSetList } from '@/sets/useSetList'
import { createSetPageLink } from '@/sets/utils'
import { usePermission } from '@/shell/ConfigurationContext'
import { ToolsOzoneSetDefs } from '@atproto/api'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from 'react-use'

const Title = ({
  editingSet,
  viewSet,
}: {
  editingSet: string | null
  viewSet: string | null
}) => {
  let title = 'Manage Sets'
  if (editingSet) {
    title = `Edit ${editingSet}`
  } else if (viewSet) {
    title = `View ${viewSet}`
  }
  return (
    <div className="flex flex-row items-center">
      {viewSet && (
        <Link href={createSetPageLink({})}>
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
        </Link>
      )}
      <h4 className="font-medium text-gray-700 dark:text-gray-100">{title}</h4>
    </div>
  )
}

// Make sure we don't update the url query param on every key stroke
const SetsSearchInput = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [inputValue, setInputValue] = useSyncedState(searchQuery)

  useDebounce(
    () => {
      if (inputValue !== searchQuery) {
        const url = createSetPageLink({ search: inputValue })
        router.push(url, { scroll: false })
      }
    },
    300,
    [inputValue],
  )

  return (
    <>
      <Input
        type="text"
        autoFocus
        className="w-3/4"
        placeholder="Search sets..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />{' '}
      <LinkButton
        size="sm"
        className="ml-1"
        appearance="outlined"
        href={createSetPageLink({})}
      >
        Cancel
      </LinkButton>
    </>
  )
}

export function SetsConfig() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('search')
  const viewSet = searchParams.get('view')
  const { fetchNextPage, data, hasNextPage, isInitialLoading } =
    useSetList(searchQuery)
  const canManageSets = usePermission('canManageSets')
  const showSetsCreateForm = searchParams.has('create')
  const editingSet = searchParams.get('edit')

  return (
    <div className="pt-4">
      <div className="flex flex-row justify-between mb-4">
        {typeof searchQuery === 'string' ? (
          <SetsSearchInput />
        ) : (
          <>
            <Title {...{ editingSet, viewSet }} />
            {!showSetsCreateForm && !editingSet && !viewSet && (
              <div className="flex flex-row items-center">
                {canManageSets && (
                  <LinkButton
                    size="sm"
                    appearance="primary"
                    href={createSetPageLink({ create: 'true' })}
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs">Add New Set</span>
                  </LinkButton>
                )}

                <LinkButton
                  size="sm"
                  className="ml-1"
                  appearance="outlined"
                  href={createSetPageLink({ search: '' })}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </LinkButton>
              </div>
            )}
          </>
        )}
      </div>
      {(showSetsCreateForm || editingSet) && (
        <SetEditor
          setName={editingSet}
          setDescription={searchParams.get('description')}
          onCancel={() => {
            const url = createSetPageLink({})
            router.push(url)
          }}
          onSuccess={() => {
            const url = createSetPageLink({})
            router.push(url)
          }}
        />
      )}

      {viewSet ? (
        <SetView setName={viewSet} />
      ) : (
        <SetList
          {...{
            hasNextPage,
            fetchNextPage,
            isInitialLoading,
            onEdit: (set: ToolsOzoneSetDefs.Set) => {
              const url = createSetPageLink({
                edit: set.name,
                description: set.description || '',
              })
              router.push(url)
            },
            searchQuery,
            canEdit: canManageSets,
            sets: data?.pages.map((page) => page.sets).flat(),
          }}
        />
      )}
    </div>
  )
}
