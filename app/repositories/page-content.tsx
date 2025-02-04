import { SectionHeader } from '../../components/SectionHeader'
import { RepositoriesTable } from '@/repositories/RepositoriesTable'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTitle } from 'react-use'
import {
  Agent,
  ToolsOzoneModerationDefs,
  ComAtprotoAdminSearchAccounts,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { ActionButton } from '@/common/buttons'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { WorkspacePanel } from '@/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { chunkArray } from '@/lib/util'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { useEmitEvent } from '@/mod-event/helpers/emitEvent'

const isEmailSearch = (q: string) => q.startsWith('email:')
const isSignatureSearch = (q: string) => q.startsWith('sig:')

const getRepos =
  ({ q, labelerAgent }: { q: string; labelerAgent: Agent }) =>
  async (
    {
      pageParam,
      excludeRepo,
    }: {
      pageParam?: string
      excludeRepo?: boolean
    },
    options: { signal?: AbortSignal } = {},
  ): Promise<{
    repos: ToolsOzoneModerationDefs.RepoView[]
    cursor?: string
  }> => {
    const limit = 25

    let data: ComAtprotoAdminSearchAccounts.OutputSchema
    if (isSignatureSearch(q)) {
      const rawValue = q.slice(4)
      const values =
        rawValue.startsWith('["') && q.endsWith('"]')
          ? // JSON array of strings
            JSON.parse(rawValue)
          : [rawValue.trim()] // slice 'sig:' prefix
      const res = await labelerAgent.tools.ozone.signature.searchAccounts({
        values,
        cursor: pageParam,
      })
      data = res.data
    } else if (isEmailSearch(q)) {
      const email = q.slice(6).trim() // slice 'email:' prefix
      const res = await labelerAgent.com.atproto.admin.searchAccounts(
        {
          email,
          limit,
          cursor: pageParam,
        },
        options,
      )
      data = res.data
    } else {
      const res = await labelerAgent.tools.ozone.moderation.searchRepos(
        {
          q,
          limit,
          cursor: pageParam,
        },
        options,
      )

      return res.data
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
      for (const accounts of chunkArray(data.accounts, 100)) {
        const { data } = await labelerAgent.tools.ozone.moderation.getRepos(
          { dids: accounts.map(({ did }) => did) },
          options,
        )
        for (const repo of data.repos) {
          if (ToolsOzoneModerationDefs.isRepoViewDetail(repo)) {
            repos[repo.did] = { ...repos[repo.did], ...repo }
          }
        }
      }
    }

    return { repos: Object.values(repos), cursor: data.cursor }
  }

function useSearchResultsQuery(q: string) {
  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const labelerAgent = useLabelerAgent()
  const getRepoPage = getRepos({ q, labelerAgent })

  const { data, fetchNextPage, hasNextPage, isLoading, refetch } =
    useInfiniteQuery({
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
    const newAbortController = new AbortController()
    abortController.current = newAbortController

    try {
      let cursor = data.pageParams[0] as string | undefined
      do {
        // When we just want the dids of the users, no need to do an extra fetch to include repos
        const nextPage = await getRepoPage(
          {
            pageParam: cursor,
            excludeRepo: true,
          },
          { signal: abortController.current?.signal },
        )
        const dids = nextPage.repos.map((f) => f.did)
        if (dids.length) await addToWorkspace(dids)
        cursor = nextPage.cursor
        //   if the modal is closed, that means the user decided not to add any more user to workspace
      } while (cursor && isConfirmationOpen)
    } catch (e) {
      if (abortController.current?.signal.reason === 'user-cancelled') {
        toast.info('Stopped adding users to workspace')
      } else {
        toast.error(`Something went wrong: ${(e as Error).message}`)
      }
    }
    setIsAdding(false)
    setIsConfirmationOpen(false)
  }

  useEffect(() => {
    if (!isConfirmationOpen) {
      abortController.current?.abort()
    }
  }, [isConfirmationOpen])

  useEffect(() => {
    // User cancelled by closing this view (navigation, other?)
    return () => abortController.current?.abort()
  }, [])

  return {
    repos,
    fetchNextPage,
    hasNextPage,
    isLoading,
    refetch,
    confirmAddToWorkspace,
    isConfirmationOpen,
    setIsConfirmationOpen,
    setIsAdding,
    isAdding,
  }
}

export default function RepositoriesListPage() {
  const emitEvent = useEmitEvent()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const searchParams = useSearchParams()
  const q = searchParams.get('term') ?? ''
  const router = useRouter()
  const pathname = usePathname()
  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const setQuickActionPanelSubject = (subject: string) => {
    const newParams = new URLSearchParams(document.location.search)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }
  const {
    repos,
    refetch,
    fetchNextPage,
    hasNextPage,
    isLoading,
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
        showEmail={isEmailSearch(q) || isSignatureSearch(q)}
        onLoadMore={fetchNextPage}
        showLoadMore={!!hasNextPage}
        isLoading={isLoading}
        showEmptySearch={!q?.length && !repos.length}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={
          repos.length ? repos.map((repo) => repo.did) : [quickOpenParam]
        }
        isInitialLoading={isLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(vals)
          refetch()
        }}
      />
    </>
  )
}
