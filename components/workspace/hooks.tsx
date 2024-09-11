import { createCSV, downloadCSV } from '@/lib/csv'
import { getLocalStorageData, setLocalStorageData } from '@/lib/local-storage'
import { buildBlueSkyAppUrl, chunkArray, pluralize } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { AppBskyActorProfile, ToolsOzoneModerationDefs } from '@atproto/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'react-toastify'

const WORKSPACE_LIST_KEY = 'workspace_list'
const WORKSPACE_LIST_DELIMITER = ','
const WORKSPACE_LIST_QUERY_KEY = 'workspace-list'

// For now, these are just simple string lists stored in the localstorage of the user's browser.
// While the use of react-query might feel like an overkill here, in the future, we may want to
// sync these with server and for that to work we would just swap out the query or mutation fn

export const useWorkspaceList = () => {
  const { data, error, isFetching } = useQuery({
    retry: false,
    queryKey: [WORKSPACE_LIST_QUERY_KEY],
    queryFn: async () => {
      return getList()
    },
  })

  return { data, error, isFetching }
}

export const useWorkspaceAddItemsMutation = () => {
  const queryClient = useQueryClient()
  const toastId = useRef<number | string | null>(null)
  const mutation = useMutation<string[], unknown, string[], unknown>(
    async (items) => {
      return addToList(items)
    },
    {
      onSuccess: (allItems, addedItems) => {
        const message = `Attempted to add ${pluralize(
          addedItems.length,
          'subject',
        )}, there are ${pluralize(
          allItems.length,
          'subject',
        )} in your workspace now.`

        if (toastId.current && toast.isActive(toastId.current)) {
          toast.update(toastId.current, {
            render: message,
          })
        } else {
          toastId.current = toast.success(message)
        }

        queryClient.invalidateQueries([WORKSPACE_LIST_QUERY_KEY])
      },
    },
  )

  return mutation
}

export const useWorkspaceRemoveItemsMutation = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation<string[], unknown, string[], unknown>(
    async (items) => {
      return removeFromList(items)
    },
    {
      onSuccess: (_, removedItems) => {
        toast.success(
          `${pluralize(
            removedItems.length,
            'subject',
          )} removed from workspace.`,
        )
        queryClient.invalidateQueries([WORKSPACE_LIST_QUERY_KEY])
      },
    },
  )

  return mutation
}

export const useWorkspaceEmptyMutation = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation(
    async () => {
      return emptyList()
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([WORKSPACE_LIST_QUERY_KEY])
      },
    },
  )

  return mutation
}

export const useWorkspaceExportMutation = () => {
  const labelerAgent = useLabelerAgent()
  return useMutation({
    mutationFn: async (items: string[]) => {
      // Items are exported in groups so we can expect all items in the group to be of same type
      // For now, only support exporting accounts
      if (!items[0].startsWith('did:')) {
        toast.error(`Exporting is only enabled for accounts.`)
        return []
      }

      const data: Record<
        string,
        ToolsOzoneModerationDefs.RepoViewDetail | null
      > = {}

      for (const itemChunk of chunkArray(items, 50)) {
        await Promise.all(
          itemChunk.map(async (did) => {
            try {
              const { data: repo } =
                await labelerAgent.tools.ozone.moderation.getRepo({
                  did,
                })

              data[did] = repo
            } catch (error) {
              // For now we're just swallowing errors and exporting what I can
              console.error(error)
              data[did] = null
            }
          }),
        )
      }

      downloadCSV(
        createCSV({
          headers: [
            'did',
            'handle',
            'email',
            'ip',
            'name',
            'labels',
            'profile',
          ],
          lines: Object.values(data).map((repo) => {
            if (!repo) return ''
            const profile = AppBskyActorProfile.isRecord(repo.relatedRecords[0])
              ? (repo.relatedRecords[0] as AppBskyActorProfile.Record)
              : null

            const line: string[] = [
              repo.did,
              repo.handle,
              repo.email || 'Unknown',
              `${repo.ip || 'Unknown'}`,
              `${profile?.displayName || 'Unknown'}`,
              repo.labels?.map(({ val }) => val).join(', ') || 'None',
              buildBlueSkyAppUrl({ did: repo.did }),
            ]
            return line.join(',')
          }),
        }),
      )

      return data
    },
  })
}

const getList = (): string[] => {
  const list = getLocalStorageData<string>(WORKSPACE_LIST_KEY)
  if (!list) return []
  return list.split(WORKSPACE_LIST_DELIMITER)
}

const addToList = (items: string[]) => {
  const list = getList()
  const newList = [...new Set([...list, ...items])]
  setLocalStorageData(
    WORKSPACE_LIST_KEY,
    newList.join(WORKSPACE_LIST_DELIMITER),
  )
  return newList
}

const removeFromList = (items: string[]) => {
  const list = getList()
  const newList = list.filter((item) => !items.includes(item))
  setLocalStorageData(
    WORKSPACE_LIST_KEY,
    newList.join(WORKSPACE_LIST_DELIMITER),
  )
  return newList
}

const emptyList = () => {
  setLocalStorageData(WORKSPACE_LIST_KEY, null)
  return []
}
