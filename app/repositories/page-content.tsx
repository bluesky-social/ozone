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
  AppBskyActorDefs,
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
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { getProfiles } from '@/repositories/api'
import { Checkbox } from '@/common/forms'
import { isHighProfileAccount } from '@/workspace/utils'

export const isEmailSearch = (q: string) => q.startsWith('email:')
export const isFullEmailSearch = (q: string) => {
  if (!isEmailSearch(q)) return false
  const email = q.slice(6).trim() // slice 'email:' prefix
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
/** Return email from search term if it is valid. */
export const getEmailFromSearch = (q: string) => {
  return isFullEmailSearch(q) ? q.slice(6).trim() : null
}
export const isSignatureSearch = (q: string) => q.startsWith('sig:')

export type ReposParams = {
  pageParam?: string
  enrich?: boolean
  options?: { signal?: AbortSignal }
}
export type ReposData = (
  | ToolsOzoneModerationDefs.RepoViewDetail
  | ToolsOzoneModerationDefs.RepoView
)[]
export type ProfilesData = Map<string, AppBskyActorDefs.ProfileViewDetailed>
export type ReposResponse = {
  repos: ReposData
  profiles?: ProfilesData
  cursor?: string
}
const getRepos =
  ({ q, labelerAgent }: { q: string; labelerAgent: Agent }) =>
  async ({
    pageParam,
    enrich = true,
    options,
  }: ReposParams): Promise<ReposResponse> => {
    const limit = 25

    let data: ComAtprotoAdminSearchAccounts.OutputSchema
    let repos: ReposData = []
    let profiles: ProfilesData = new Map()

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

      // Still add profile data if doing generic search
      if (enrich) {
        profiles = await getProfiles(
          labelerAgent,
          res.data.repos.map((repo) => repo.did),
        )
      }

      return { ...res.data, profiles }
    }

    if (!data.accounts.length) {
      return { repos, profiles, cursor: data.cursor }
    }

    const repoMap: Record<string, ToolsOzoneModerationDefs.RepoViewDetail> = {}
    data.accounts.forEach((account) => {
      repoMap[account.did] = {
        ...account,
        $type: 'tools.ozone.moderation.defs#repoViewDetail',
        // Set placeholder properties that will be later filled in with data from ozone
        relatedRecords: [],
        indexedAt: account.indexedAt,
        moderation: {},
        labels: [],
      }
    })

    if (enrich) {
      const results = await Promise.all([
        (async () => {
          for (const accounts of chunkArray(data.accounts, 100)) {
            const { data } = await labelerAgent.tools.ozone.moderation.getRepos(
              { dids: accounts.map(({ did }) => did) },
              options,
            )
            for (const repo of data.repos) {
              if (ToolsOzoneModerationDefs.isRepoViewDetail(repo)) {
                repoMap[repo.did] = { ...repoMap[repo.did], ...repo }
              }
            }
          }
          return Object.values(repoMap)
        })(),
        getProfiles(
          labelerAgent,
          data.accounts.map(({ did }) => did),
        ),
      ])
      repos = results[0]
      profiles = results[1]
    }

    return { repos, profiles, cursor: data.cursor }
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
  const profiles: ProfilesData = new Map(
    data?.pages.flatMap((page) =>
      page.profiles ? Array.from(page.profiles.entries()) : [],
    ) ?? [],
  )

  const confirmAddToWorkspace = async (includeHighProfile: boolean) => {
    setIsAdding(true)
    const newAbortController = new AbortController()
    abortController.current = newAbortController

    try {
      let cursor: string | undefined
      do {
        const page = await getRepoPage({
          pageParam: cursor,
          enrich: !includeHighProfile,
          options: { signal: abortController.current?.signal },
        })
        let dids = page.repos.map((f) => f.did)
        if (!includeHighProfile) {
          dids = dids.filter((did) => {
            const profile = page.profiles?.get(did)
            return !isHighProfileAccount(profile?.followersCount)
          })
        }
        if (dids.length) addToWorkspace(dids)
        cursor = page.cursor
        // if the modal is closed, that means the user decided not to add any more user to workspace
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
      abortController.current?.abort('user-cancelled')
    }
  }, [isConfirmationOpen])

  useEffect(() => {
    // User cancelled by closing this view (navigation, other?)
    return () => abortController.current?.abort('user-cancelled')
  }, [])

  return {
    repos,
    profiles,
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
    profiles,
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

  const [includeHighProfile, setIncludeHighProfile] = useState(false)

  const openConfirmation = () => {
    setIncludeHighProfile(false) // reset to default value each time modal is opened
    setIsConfirmationOpen(true)
  }

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
            onClick={openConfirmation}
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

              confirmAddToWorkspace(includeHighProfile)
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
          >
            <Checkbox
              label="Include high profile users"
              checked={includeHighProfile}
              onChange={(e) => setIncludeHighProfile(e.target.checked)}
            />
          </ConfirmationModal>
        </div>
      </SectionHeader>

      <RepositoriesTable
        repos={repos}
        showEmail={isEmailSearch(q) || isSignatureSearch(q)}
        searchedEmail={getEmailFromSearch(q)}
        onLoadMore={fetchNextPage}
        showLoadMore={!!hasNextPage}
        isLoading={isLoading}
        showEmptySearch={!q?.length && !repos.length}
        profiles={profiles}
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
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          refetch()
        }}
      />
    </>
  )
}
