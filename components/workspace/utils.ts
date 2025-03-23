import { CollectionId, EmbedTypes } from '@/reports/helpers/subject'
import { pluralize } from '@/lib/util'
import { WorkspaceFilterItem } from './types'
import { ToolsOzoneModerationDefs } from '@atproto/api'

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

const matchText = (needle: string, haystack?: string) => {
  if (!haystack) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

const isBefore = (left: string, right?: string) => {
  if (!right) return false
  return new Date(left) < new Date(right)
}

export const checkFilterMatchForWorkspaceItem = (
  filter: WorkspaceFilterItem,
  data: ToolsOzoneModerationDefs.SubjectView,
): boolean => {
  switch (filter.field) {
    case 'emailConfirmed':
      const confirmedAt = data.repo?.emailConfirmedAt
      return filter.value ? !!confirmedAt : !confirmedAt
    case 'displayName':
      return matchText(filter.value, data.profile?.displayName)
    case 'description':
      return matchText(filter.value, data.profile?.description)
    case 'accountCreated':
      const isCreatedAfterFilter = isBefore(
        filter.value,
        data.profile?.createdAt,
      )
      return filter.operator === 'gte'
        ? isCreatedAfterFilter
        : !isCreatedAfterFilter
    case 'recordCreated':
      const isRecordCreatedAfterFilter = isBefore(
        filter.value,
        data.record?.value.createdAt
          ? `${data.record?.value.createdAt}`
          : undefined,
      )
      return filter.operator === 'gte'
        ? isRecordCreatedAfterFilter
        : !isRecordCreatedAfterFilter
    case 'imageEmbed':
      return !!data.status?.tags?.includes(EmbedTypes.Image)
    case 'videoEmbed':
      return !!data.status?.tags?.includes(EmbedTypes.Video)
    case 'content':
      return matchText(
        filter.value,
        data.record?.value?.text ? `${data.record?.value?.text}` : undefined,
      )
    case 'reviewState':
      return data.status?.reviewState === filter.value
    case 'takendown':
      return !!data.status?.takendown
    default:
      return false
  }
}
