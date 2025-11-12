import {
  createCSV,
  downloadCSV,
  escapeCSVValue,
  processFileForWorkspaceImport,
} from '@/lib/csv'
import { getLocalStorageData, setLocalStorageData } from '@/lib/local-storage'
import { buildBlueSkyAppUrl, isNonNullable, pluralize } from '@/lib/util'
import { regenerateBatchId } from '@/lib/batchId'
import { useServerConfig } from '@/shell/ConfigurationContext'
import {
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  asPredicate,
  AtUri,
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
  ToolsOzoneTeamDefs,
} from '@atproto/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { WorkspaceListData } from './useWorkspaceListData'
import { getProfileFromRepo } from '@/repositories/helpers'

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

export const WORKSPACE_EXPORT_FIELDS = [
  'did',
  'handle',
  'email',
  'ip',
  'name',
  'labels',
  'tags',
  'bskyUrl',
  'createdAt',
  'text',
  'langs',
  'embeds',
]
export const ADMIN_ONLY_WORKSPACE_EXPORT_FIELDS = ['email', 'ip']
const filterExportFields = (fields: string[], isAdmin: boolean) => {
  // There's a slight bit of overhead here but iterating over the original fields
  // Ensure that the order of header and row columns always match
  return WORKSPACE_EXPORT_FIELDS.filter((field) => {
    if (fields.includes(field)) {
      return isAdmin || !ADMIN_ONLY_WORKSPACE_EXPORT_FIELDS.includes(field)
    }
    return false
  })
}

const ifString = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined

type ExportableObject = {
  did: string
  handle?: string
  email?: string
  ip: string
  name: string
  labels: string
  tags: string | undefined
  bskyUrl: string
  relatedRecords?: any[]
  createdAt?: string
  text?: string
  langs?: string
  embeds?: string
}

const getExportFieldsFromWorkspaceListItem = (
  item: ToolsOzoneModerationDefs.SubjectView,
): ExportableObject | null => {
  let exportableObject: ExportableObject | null = null
  if (item.repo) {
    const { repo } = item
    const profile = getProfileFromRepo(repo.relatedRecords)
    exportableObject = {
      did: repo.did,
      handle: repo.handle,
      email: repo.email,
      ip: 'Unknown',
      name: profile?.displayName || '',
      tags: repo.moderation.subjectStatus?.tags?.join('|'),
      bskyUrl: buildBlueSkyAppUrl({ did: repo.did }),
      // @ts-expect-error - Un-spec'd field returned by PDS
      ip: ifString(repo.ip) ?? 'Unknown',
      labels: repo.labels?.map(({ val }) => val).join('|') || 'Unknown',
      createdAt: ifString(repo.indexedAt) ?? '',
    }
  } else if (item.status) {
    const did = ComAtprotoRepoStrongRef.isMain(item.status.subject)
      ? new AtUri(item.status.subject.uri).host
      : ComAtprotoAdminDefs.isRepoRef(item.status.subject)
      ? item.status.subject.did
      : ''
    exportableObject = {
      did,
      handle: item.status.subjectRepoHandle,
      relatedRecords: [] as {}[],
      email: 'Unknown',
      ip: 'Unknown',
      labels: 'None',
      name: 'Unknown',
      tags: item.status.tags?.join('|'),
      bskyUrl: buildBlueSkyAppUrl({ did }),
    }
  }

  if (item.record && exportableObject) {
    console.log(item)
    const recordData = {
      tags: item.record.moderation.subjectStatus?.tags?.join('|'),
      labels: item.record.labels?.map(({ val }) => val).join('|') || 'Unknown',
      text: ifString(item.record.value.text) ?? '',
      langs: Array.isArray(item.record.value.langs)
        ? item.record.value.langs.join('|')
        : '',
      createdAt: ifString(item.record.indexedAt) ?? '',
      embeds: item.record.value.embed
        ? getEmbedValues(item.record.value.embed)
        : '',
    }
    exportableObject = {
      ...exportableObject,
      ...recordData,
    }
  }

  return exportableObject
}

const getEmbedValues = (embed: unknown): string => {
  if (asPredicate(AppBskyEmbedImages.validateMain)(embed)) {
    return embed.images
      .map(({ image }) => {
        return image.ref.toString()
      })
      .join('|')
  }
  if (asPredicate(AppBskyEmbedRecord.validateMain)(embed)) {
    return embed.record.uri
  }
  return ''
}

export const useWorkspaceExport = () => {
  const { role } = useServerConfig()
  const isAdmin = role === ToolsOzoneTeamDefs.ROLEADMIN
  const headers = isAdmin
    ? WORKSPACE_EXPORT_FIELDS
    : WORKSPACE_EXPORT_FIELDS.filter(
        (field) => !ADMIN_ONLY_WORKSPACE_EXPORT_FIELDS.includes(field),
      )

  const [selectedColumns, setSelectedColumns] = useState(headers)
  const [filename, setFilename] = useState(`workspace-export`)

  const mutation = useMutation({
    mutationFn: async (items: WorkspaceListData) => {
      const exportHeaders = filterExportFields(selectedColumns, isAdmin)
      downloadCSV(
        createCSV({
          filename,
          headers: exportHeaders,
          lines: Object.values(items)
            .map((item) => {
              if (!item) return ''

              const exportFields = getExportFieldsFromWorkspaceListItem(item)
              if (!exportFields) return ''

              const line: Array<string | undefined> = []

              exportHeaders.forEach((header) => {
                if (header in exportFields) {
                  line.push(exportFields[header])
                }
              })

              return line.filter(isNonNullable).map(escapeCSVValue).join(',')
            })
            .filter(Boolean),
        }),
      )
    },
  })

  return {
    headers,
    selectedColumns,
    setSelectedColumns,
    filename,
    setFilename,
    ...mutation,
  }
}

export const useWorkspaceImport = () => {
  const { mutateAsync: addToWorkspace } = useWorkspaceAddItemsMutation()

  const importFromFiles = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    try {
      const results = await Promise.all(
        acceptedFiles.map((file) => processFileForWorkspaceImport(file)),
      )
      const items = results.flat()
      addToWorkspace(items)
    } catch (error) {
      toast.error(
        `Failed to import items to workspace. ${(error as Error).message}`,
      )
    }
  }

  return { importFromFiles }
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
  // Clearing workspace needs to regenerate Batch ID to avoid accidental duplicate batch ids
  regenerateBatchId()
  return []
}
