import { CollectionId } from '@/reports/helpers/subject'
import { WorkspaceListItemData } from './useWorkspaceListData'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { pluralize } from '@/lib/util'

export type GroupedSubjects = {
  dids: string[]
  posts: string[]
  profiles: string[]
  lists: string[]
  others: string[]
}

export const groupSubjects = (items: string[]): GroupedSubjects => {
  const grouped: GroupedSubjects = {
    dids: [],
    posts: [],
    profiles: [],
    lists: [],
    others: [],
  }

  items.forEach((item) => {
    // drop any item that does not start with did: or at:// since they can't be valid subjects
    if (item.startsWith('did:')) {
      grouped.dids.push(item)
    } else if (item.startsWith('at://')) {
      if (item.includes(CollectionId.Post)) {
        grouped.posts.push(item)
      } else if (item.includes(CollectionId.Profile)) {
        grouped.profiles.push(item)
      } else if (item.includes(CollectionId.List)) {
        grouped.lists.push(item)
      } else {
        grouped.others.push(item)
      }
    }
  })

  return grouped
}

export const buildItemsSummary = (groupedItems: GroupedSubjects): string => {
  return [
    groupedItems.dids.length > 0 &&
      pluralize(groupedItems.dids.length, 'Account', { includeCount: true }),
    groupedItems.posts.length > 0 &&
      pluralize(groupedItems.posts.length, 'Post', { includeCount: true }),
    groupedItems.lists.length > 0 &&
      pluralize(groupedItems.lists.length, 'List', { includeCount: true }),
    groupedItems.profiles.length > 0 &&
      pluralize(groupedItems.profiles.length, 'Profile', {
        includeCount: true,
      }),
    groupedItems.others.length > 0 &&
      pluralize(groupedItems.others.length, 'Other', { includeCount: true }),
  ]
    .filter(Boolean)
    .join(', ')
}

export const isItemDataSubjectStatusView = (
  itemData: WorkspaceListItemData,
): itemData is ToolsOzoneModerationDefs.SubjectStatusView => {
  return !!itemData?.reviewState
}

export const getRepoHandleFromItemData = (itemData: WorkspaceListItemData) => {
  if (ToolsOzoneModerationDefs.isRepoViewDetail(itemData)) {
    return itemData.handle
  }

  if (ToolsOzoneModerationDefs.isRecordViewDetail(itemData)) {
    return itemData.repo.handle
  }

  if (isItemDataSubjectStatusView(itemData)) {
    return itemData.subjectRepoHandle
  }

  return ''
}

export const getAccountDeactivatedAtFromItemData = (
  itemData: WorkspaceListItemData,
) => {
  if (ToolsOzoneModerationDefs.isRepoViewDetail(itemData)) {
    return itemData.deactivatedAt
  }

  if (ToolsOzoneModerationDefs.isRecordViewDetail(itemData)) {
    return itemData.repo.deactivatedAt
  }

  return ''
}

export const getSubjectStatusFromItemData = (
  itemData: WorkspaceListItemData | undefined,
) => {
  if (!itemData) return undefined

  if (isItemDataSubjectStatusView(itemData)) {
    return itemData
  }

  return itemData.moderation.subjectStatus
}
