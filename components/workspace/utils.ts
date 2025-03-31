import { CollectionId, EmbedTypes } from '@/reports/helpers/subject'
import { pluralize } from '@/lib/util'
import { DurationUnit, WorkspaceFilterItem } from './types'
import { AppBskyActorDefs, ToolsOzoneModerationDefs } from '@atproto/api'
import { addDays, addMonths, addWeeks, addYears } from 'date-fns'
import { WorkspaceListData } from './useWorkspaceListData'
import { HIGH_PROFILE_FOLLOWER_THRESHOLD } from '@/lib/constants'
import { isValidProfileViewDetailed } from '@/repositories/helpers'

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

const isMinAge = (value: number, unit: DurationUnit, dob?: string) => {
  if (!dob) return false
  let ref = new Date(dob)
  if (unit === 'days') {
    ref = addDays(ref, value)
  } else if (unit === 'weeks') {
    ref = addWeeks(ref, value)
  } else if (unit === 'months') {
    ref = addMonths(ref, value)
  } else if (unit === 'years') {
    ref = addYears(ref, value)
  }

  return ref <= new Date()
}

export const checkFilterMatchForWorkspaceItem = (
  filter: WorkspaceFilterItem,
  data: ToolsOzoneModerationDefs.SubjectView,
): boolean => {
  switch (filter.field) {
    case 'emailConfirmed':
      const confirmedAt = data.repo?.emailConfirmedAt
      return !!filter.value ? !!confirmedAt : !confirmedAt
    case 'followersCount':
      if (!isValidProfileViewDetailed(data.profile)) return false
      const { followersCount } = data.profile
      if (!followersCount) return false
      return filter.operator === 'gte'
        ? followersCount >= Number(filter.value)
        : followersCount <= Number(filter.value)
    case 'followsCount':
      if (!isValidProfileViewDetailed(data.profile)) return false
      const { followsCount } = data.profile || {}
      if (!followsCount) return false
      console.log(filter, data.profile)
      return filter.operator === 'gte'
        ? followsCount >= Number(filter.value)
        : followsCount <= Number(filter.value)
    case 'displayName':
      if (!isValidProfileViewDetailed(data.profile)) return false
      return matchText(filter.value, data.profile?.displayName)
    case 'description':
      if (!isValidProfileViewDetailed(data.profile)) return false
      return matchText(filter.value, data.profile?.description)
    case 'accountAge':
      if (!isValidProfileViewDetailed(data.profile)) return false
      const isCreatedAfterFilter = isMinAge(
        filter.value,
        filter.unit,
        data.profile?.createdAt,
      )
      return filter.operator === 'gte'
        ? isCreatedAfterFilter
        : !isCreatedAfterFilter
    case 'recordCreated':
      const isRecordCreatedAfterFilter = isMinAge(
        filter.value,
        filter.unit,
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
        data.record?.value?.text ? `${data.record.value.text}` : undefined,
      )
    case 'emailContains':
      return matchText(filter.value, data.repo?.email)
    case 'reviewState':
      return filter.operator === 'eq'
        ? data.status?.reviewState === filter.value
        : data.status?.reviewState !== filter.value
    case 'takendown':
      return filter.operator === 'eq'
        ? !!data.status?.takendown
        : !data.status?.takendown
    default:
      return false
  }
}

export const findHighProfileCountInWorkspace = (list: WorkspaceListData) => {
  let total = 0

  for (const item of Object.values(list)) {
    if (
      isValidProfileViewDetailed(item.profile) &&
      item.profile.followersCount &&
      item.profile.followersCount >= HIGH_PROFILE_FOLLOWER_THRESHOLD
    ) {
      total++
    }
  }

  return total
}
