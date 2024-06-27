import { CollectionId } from '@/reports/helpers/subject'

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
    groupedItems.dids.length > 0 && `${groupedItems.dids.length} Accounts`,
    groupedItems.posts.length > 0 && `${groupedItems.posts.length} Posts`,
    groupedItems.lists.length > 0 && `${groupedItems.lists.length} Lists`,
    groupedItems.profiles.length > 0 &&
      `${groupedItems.profiles.length} Profiles`,
    groupedItems.others.length > 0 && `${groupedItems.others.length} Others`,
  ]
    .filter(Boolean)
    .join(', ')
}
