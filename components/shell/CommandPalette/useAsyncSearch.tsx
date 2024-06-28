import { getDidFromHandle } from '@/lib/identity'
import { CollectionId, getCollectionName } from '@/reports/helpers/subject'
import { useSearchActorsTypeahead } from '@/repositories/useSearchActorsTypeahead'
import { AppBskyActorDefs, AtUri } from '@atproto/api'
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline'
import {
  useKBar,
  Action,
  useRegisterActions,
  createAction,
  ActionSection,
  KBarQuery,
} from 'kbar'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  isBlueSkyAppUrl,
  getFragmentsFromBlueSkyAppUrl,
  isValidDid,
  isValidHandle,
  parseAtUri,
  buildAtUriFromFragments,
} from '../../../lib/util'

const PostIcon = ChatBubbleLeftIcon
const RepoIcon = UserGroupIcon
const iconClassName = 'h-7 w-7'
type ItemBuilderProps = {
  type: 'did' | 'handle'
  profileKey: string
  search: string
  router: AppRouterInstance
}
const ActionSections: Record<string, ActionSection> = {
  actions: {
    name: 'Actions',
    priority: 3,
  },
  details: {
    name: 'Details',
    priority: 2,
  },
  reports: {
    name: 'Reports',
    priority: 1,
  },
}

const buildItemForDid = ({
  search,
  did,
  handle,
  router,
}: Omit<ItemBuilderProps, 'profileKey' | 'type'> & {
  did: string
  handle?: string
}): Action[] => {
  const actions = [
    {
      id: `show-action-for-did`,
      name: `Take action on ${handle || did}`,
      keywords: `${search},search,action,did`,
      icon: <RepoIcon className={iconClassName} />,
      subtitle: `Open DID in action panel`,
      section: ActionSections.actions,
      priority: 5,
      perform: () => {
        router.push(`?quickOpen=${did}`)
      },
    },
    {
      id: `search-subjects-last-reviewed-by-did`,
      name: `Subjects last reviewed by ${handle || did}`,
      keywords: `${search},search,did`,
      icon: <LifebuoyIcon className={iconClassName} />,
      subtitle: `Go to reports page and see all subjects that were last reviewed by this moderator`,
      section: ActionSections.reports,
      perform: () => {
        router.push(`/reports?term=lastReviewedBy:${did}`)
      },
    },
  ]

  return actions
}

const buildItemFromTypeahead = ({
  search,
  actors = [],
  kBarQuery,
}: Omit<ItemBuilderProps, 'profileKey' | 'type' | 'router'> & {
  actors: AppBskyActorDefs.ProfileViewBasic[]
  kBarQuery: KBarQuery
}): Action[] => {
  return actors.map((actor) => ({
    id: `profile-${actor.did}`,
    name: `@${actor.handle}`,
    keywords: `${search},actor,${actor.displayName}, ${actor.handle}`,
    icon: <RepoIcon className={iconClassName} />,
    subtitle: `${actor.displayName || actor.did}`,
    section: ActionSections.actions,
    priority: 1,
    perform: () => {
      kBarQuery.setSearch(actor.did)
      kBarQuery.toggle()
    },
  }))
}

const buildItemForProfile = ({
  type,
  search,
  profileKey,
  router,
}: ItemBuilderProps): Action[] => {
  const typeText = type === 'did' ? type.toUpperCase() : type
  const actions: Action[] = []

  // Right now, we can't search reports by a handle
  if (type !== 'handle') {
    actions.push(
      ...buildItemForDid({
        search,
        router,
        did: profileKey,
      }),
    )
  }

  actions.push(
    {
      id: `view-profile-by-${type}`,
      name: `Profile for ${profileKey}`,
      section: ActionSections.details,
      keywords: `${search},view,${type}`,
      icon: <RepoIcon className={iconClassName} />,
      subtitle: `Go to profile page of this ${typeText}`,
      perform: () => {
        router.push(`/repositories/${profileKey.replace('@', '')}`)
      },
    },
    {
      id: `report-account-by-${type}`,
      name: `Report account for ${profileKey}`,
      section: ActionSections.actions,
      keywords: `${search},report,action,${type}`,
      icon: <RepoIcon className={iconClassName} />,
      subtitle: `Go to profile page and report this ${typeText}`,
      perform: () => {
        router.push(
          `/repositories/${profileKey.replace('@', '')}?reportUri=default`,
        )
      },
    },
    {
      id: `email-account-by-${type}`,
      name: `Send email to ${profileKey}`,
      section: ActionSections.actions,
      keywords: `${search},email,action,${type}`,
      icon: <RepoIcon className={iconClassName} />,
      subtitle: `Open email composer for ${typeText}`,
      perform: () => {
        router.push(`/repositories/${profileKey.replace('@', '')}?tab=email`)
      },
    },
  )

  return actions
}

export const useCommandPaletteAsyncSearch = () => {
  const router = useRouter()
  const { search, query: kBarQuery } = useKBar<{ search: string }>((state) => ({
    search: state.searchQuery,
  }))

  const { data: typeaheadResults } = useSearchActorsTypeahead(search)

  const [didFromHandle, setDidFromHandle] = useState<{
    did: string
    handle: string
  }>({ did: '', handle: '' })
  const setDidFromSearch = (handle: string) => {
    setDidFromHandle({ did: '', handle })
    if (!handle) return
    getDidFromHandle(handle).then((did) => {
      if (did) {
        setDidFromHandle({ did, handle })
      } else {
        setDidFromHandle({ did: '', handle })
      }
    })
  }

  useEffect(() => {
    // When full url is pasted in, it may contain user handle
    // so let's check for the full URL match first
    if (isBlueSkyAppUrl(search)) {
      const fragments = getFragmentsFromBlueSkyAppUrl(search)
      if (fragments?.handle) {
        setDidFromSearch(fragments.handle)
      }
      // When the search query is an at-uri, it surely won't be a valid handle
    } else if (isValidHandle(search) && !search.startsWith('at://')) {
      setDidFromSearch(search)
    } else {
      setDidFromSearch('')
    }
  }, [search])

  const memoizedActions = useMemo(() => {
    const actions: Action[] = []
    if (search?.length < 2) {
      return actions
    }

    if (search.trim() === 'tetris') {
      actions.push({
        id: 'tetris',
        name: `Tetris`,
        icon: <PuzzlePieceIcon className={iconClassName} />,
        keywords: `tetris, surprise`,
        subtitle: 'Take a quick break!',
        perform: () => {
          router.push(`/surprise-me`)
        },
      })
    } else if (isBlueSkyAppUrl(search)) {
      const fragments = getFragmentsFromBlueSkyAppUrl(search)
      // From the URL, if we didn't get a DID but if the handle was resolved into DID
      // let's inject the DID into the fragments container so we can use it when building atUri
      if (fragments?.handle && !fragments?.did && didFromHandle.did) {
        fragments.did = didFromHandle.did
      }
      const atUri = buildAtUriFromFragments(fragments)
      const collectionName = getCollectionName(fragments?.collection || '')

      if (fragments?.did) {
        actions.push(
          ...buildItemForProfile({
            search,
            router,
            type: 'did',
            profileKey: fragments.did,
          }),
        )
      }

      if (fragments?.handle) {
        actions.push(
          ...buildItemForProfile({
            search,
            router,
            type: 'handle',
            profileKey: fragments.handle,
          }),
        )
      }

      if (fragments?.rkey && collectionName) {
        if (atUri) {
          actions.push({
            id: `show-action-for-${collectionName}`,
            name: `Take action on ${collectionName}`,
            keywords: `${search},${collectionName},search,action`,
            icon: <PostIcon className={iconClassName} />,
            subtitle: `Open ${collectionName} in action panel`,
            section: ActionSections.actions,
            // When we have an exact content by rkey, we want to prioritize it over action for the account by did
            priority: 6,
            perform: () => {
              router.push(`?quickOpen=${atUri}`)
            },
          })
        }
        actions.push(
          {
            id: `report-${collectionName}`,
            name: `Report ${collectionName} ${fragments.rkey}`,
            section: ActionSections.actions,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},report,${collectionName}`,
            subtitle: `Go to ${collectionName} record and open report panel`,
            perform: () => {
              router.push(
                `/repositories/${fragments.did || fragments.handle}/${
                  CollectionId.Post
                }/${fragments.rkey}?reportUri=default`,
              )
            },
          },
          {
            id: `view-${collectionName}`,
            name: `View ${collectionName} ${fragments.rkey}`,
            section: ActionSections.details,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},view,${collectionName}`,
            subtitle: `Go to ${collectionName} record`,
            perform: () => {
              router.push(
                `/repositories/${fragments.did || fragments.handle}/${
                  CollectionId.Post
                }/${fragments.rkey}`,
              )
            },
          },
          {
            id: `search-reports-by-${collectionName}`,
            name: `Reports for ${collectionName} ${fragments.rkey}`,
            section: ActionSections.reports,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},search,report,${collectionName}`,
            subtitle: `Go to reports page and filter by this ${collectionName}`,
            perform: () => {
              router.push(
                `/reports?term=at://${fragments.did || fragments.handle}/${
                  CollectionId.Post
                }/${fragments.rkey}`,
              )
            },
          },
        )
      }
    } else if (search.startsWith('at://')) {
      const { did, collection, rkey } = parseAtUri(search) || {}
      if (did && collection && rkey) {
        const readableCollection = getCollectionName(collection)
        actions.push(
          {
            id: `report-${readableCollection}`,
            name: `Report ${readableCollection} ${rkey}`,
            section: ActionSections.actions,
            icon: <PostIcon className={iconClassName} />,
            keywords: `report,${readableCollection},${search}`,
            subtitle: `Go to ${readableCollection} record and open report panel`,
            perform: () => {
              router.push(
                `/repositories/${did}/${collection}/${rkey}?reportUri=${search}`,
              )
            },
          },
          {
            id: `action-${readableCollection}`,
            name: `Action ${readableCollection} ${rkey}`,
            section: ActionSections.actions,
            icon: <PostIcon className={iconClassName} />,
            keywords: `action,${readableCollection},${search}`,
            subtitle: 'Open action panel for post',
            // for a complete record uri, we would want it to be the first action
            // the account actions should come after it
            priority: 7,
            perform: () => {
              router.push(
                `?quickOpen=${AtUri.make(did, collection, rkey).toString()}`,
              )
            },
          },
          {
            id: `view-${readableCollection}`,
            name: `View ${readableCollection} ${rkey}`,
            section: ActionSections.details,
            icon: <PostIcon className={iconClassName} />,
            keywords: `view,${readableCollection},${search}`,
            subtitle: `Go to ${readableCollection} record`,
            perform: () => {
              router.push(`/repositories/${did}/${collection}/${rkey}`)
            },
          },
        )
      }

      if (did) {
        actions.push(
          ...buildItemForProfile({
            search,
            router,
            type: 'did',
            profileKey: did,
          }),
        )
      }
    } else if (isValidDid(search)) {
      actions.push(
        ...buildItemForProfile({
          search,
          router,
          type: 'did',
          profileKey: search,
        }),
      )
    } else if (search.startsWith('@')) {
      actions.push(
        ...buildItemFromTypeahead({
          search,
          actors: typeaheadResults || [],
          kBarQuery,
        }),
      )
    } else if (isValidHandle(search)) {
      actions.push(
        ...buildItemForProfile({
          search,
          router,
          type: 'handle',
          profileKey: search,
        }),
      )
    }

    if (didFromHandle.handle) {
      actions.push(
        ...buildItemForDid({
          search,
          router,
          handle: didFromHandle.handle,
          did: didFromHandle.did,
        }),
      )
    }

    return actions.map(createAction)
  }, [search, didFromHandle, typeaheadResults])

  useRegisterActions(memoizedActions, [search, didFromHandle])
}
