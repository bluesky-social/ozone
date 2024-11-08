import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTitle } from 'react-use'
import {
  Agent,
  ToolsOzoneModerationDefs,
  ComAtprotoAdminSearchAccounts,
} from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ActionButton } from '@/common/buttons'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { WorkspacePanel } from '@/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'

const isEmailSearch = (q: string) => q.startsWith('email:')
const isSignatureSearch = (q: string) => q.startsWith('sig:')

const getRepos =
  ({ q, labelerAgent }: { q: string; labelerAgent: Agent }) =>
  async ({
    pageParam,
    excludeRepo,
  }: {
    pageParam?: string
    excludeRepo?: boolean
  }) => {
    const limit = 25

    if (!isEmailSearch(q) && !isSignatureSearch(q)) {
      const { data } = await labelerAgent.tools.ozone.moderation.searchRepos({
        q,
        limit,
        cursor: pageParam,
      })

      return data
    }

    let data: ComAtprotoAdminSearchAccounts.OutputSchema
    if (isSignatureSearch(q)) {
      const value = q.replace('sig:', '').trim()
      const res = await labelerAgent.tools.ozone.signature.searchAccounts({
        values: [value],
      })
      data = res.data
    } else {
      const email = q.replace('email:', '').trim()
      const res = await labelerAgent.com.atproto.admin.searchAccounts({
        email,
        limit,
        cursor: pageParam,
      })
      data = res.data
    }

    if (!data.accounts.length) {
      return { repos: [], cursor: data.cursor }
    }

    const repos: Record<string, ToolsOzoneModerationDefs.RepoView> = {}
    data.accounts.forEach((account) => {
      repos[account.did] = {
        ...account,
        // Set placeholder properties that will be later filled in with data from ozone
        relatedRecords: [],
        indexedAt: account.indexedAt,
        moderation: {},
        labels: [],
      }
    })

    if (!excludeRepo) {
      await Promise.allSettled(
        data.accounts.map(async (account) => {
          const { data } = await labelerAgent.tools.ozone.moderation.getRepo({
            did: account.did,
          })
          repos[account.did] = { ...repos[account.did], ...data }
        }),
      )
    }

    return { repos: Object.values(repos), cursor: data.cursor }
  }

function useSearchResultsQuery(q: string) {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const labelerAgent = useLabelerAgent()
  const getRepoPage = getRepos({ q, labelerAgent })

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['repositories', { q }],
    queryFn: getRepoPage,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.cursor,
  })
  const repos = data?.pages.flatMap((page) => page.repos) ?? []

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addToWorkspace(repos.map((f) => f.did))
    if (!data?.pageParams) {
      setIsConfirmationOpen(false)
      return
    }
    setIsAdding(true)

    try {
      let cursor = data.pageParams[0] as string | undefined
      do {
        // When we just want the dids of the users, no need to do an extra fetch to include repos
        const nextPage = await getRepoPage({
          pageParam: cursor,
          excludeRepo: true,
        })
        const dids = nextPage.repos.map((f) => f.did)
        if (dids.length) await addToWorkspace(dids)
        cursor = nextPage.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      toast.error(`Something went wrong: ${(e as Error).message}`)
    }
    setIsAdding(false)
    setIsConfirmationOpen(false)
  }

  return {
    repos,
    fetchNextPage,
    hasNextPage,
    confirmAddToWorkspace,
    isConfirmationOpen,
    setIsConfirmationOpen,
    setIsAdding,
    isAdding,
  }
}

export default function RepositoriesListPage() {
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const params = useSearchParams()
  const q = params.get('term') ?? ''
  const {
    repos,
    fetchNextPage,
    hasNextPage,
    setIsConfirmationOpen,
    isAdding,
    setIsAdding,
    isConfirmationOpen,
    confirmAddToWorkspace,
  } = useSearchResultsQuery(q)

  let pageTitle = `Repositories`
  if (q) {
    pageTitle += ` - ${q}`
  }

  useTitle(pageTitle)

  return (
    <>
      <SectionHeader
        title="Repositories"
        tabs={[
          {
            key: 'all',
            name: 'All',
            href: `/repositories`,
          },
        ]}
        current="all"
      >
        <div className="flex-1 lg:text-right lg:pr-2 pb-4 px-1 pt-5 lg:pt-0">
          <ActionButton
            size="sm"
            disabled={!repos?.length}
            title={
              !repos.length
                ? 'No users to be added to workspace'
                : 'All users will be added to workspace'
            }
            appearance={!!repos.length ? 'primary' : 'outlined'}
            onClick={() => setIsConfirmationOpen(true)}
          >
            Add all to workspace
          </ActionButton>
          <ConfirmationModal
            onConfirm={() => {
              if (isAdding) {
                setIsAdding(false)
                setIsConfirmationOpen(false)
                return
              }

              confirmAddToWorkspace()
            }}
            isOpen={isConfirmationOpen}
            setIsOpen={setIsConfirmationOpen}
            confirmButtonText={isAdding ? 'Stop adding' : 'Yes, add all'}
            title={`Add to workspace?`}
            description={
              <>
                Once confirmed, all users from this page will be added to the
                workspace. If there are a lot of users matching your search
                query, this may take quite some time but you can always stop the
                process and already added users will remain in the workspace.
              </>
            }
          />
        </div>
      </SectionHeader>

      <RepositoriesTable
        repos={repos}
        showEmail={isEmailSearch(q)}
        onLoadMore={fetchNextPage}
        showLoadMore={!!hasNextPage}
        showEmptySearch={!q?.length && !repos.length}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </>
  )
}
