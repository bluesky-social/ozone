import clientManager from '@/lib/client'
import { CollectionId } from '@/reports/helpers/subject'
import { AtUri } from '@atproto/api'
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
  LifebuoyIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline'
import {
  useKBar,
  Action,
  useRegisterActions,
  createAction,
  ActionSection,
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
  reports: {
    name: 'Reports',
    priority: 2,
  },
  details: {
    name: 'Details',
    priority: 1,
  },
}

const getDidFromHandle = async (handle: string): Promise<string | null> => {
  try {
    const { data } = await clientManager.api.com.atproto.identity.resolveHandle(
      {
        handle,
      },
    )
    return data.did
  } catch (err) {
    return null
  }
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

const buildItemForProfile = ({
  type,
  search,
  profileKey,
  router,
}: ItemBuilderProps): Action[] => {
  const typeText = type === 'did' ? type.toUpperCase() : type
  const actions: Action[] = [
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
  ]

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

  return actions
}

export const useCommandPaletteAsyncSearch = () => {
  const router = useRouter()
  const { search } = useKBar<{ search: string }>((state) => ({
    search: state.searchQuery,
  }))
  const [didFromHandle, setDidFromHandle] = useState<string>('')
  const setDidFromSearch = () =>
    getDidFromHandle(search).then((did) => {
      if (did) {
        setDidFromHandle(did)
      } else {
        setDidFromHandle('')
      }
    })

  useEffect(() => {
    if (isValidHandle(search)) {
      setDidFromSearch()
    } else if (isBlueSkyAppUrl(search)) {
      const fragments = getFragmentsFromBlueSkyAppUrl(search)
      if (fragments?.handle) {
        setDidFromSearch()
      }
    } else {
      setDidFromHandle('')
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

      if (fragments?.cid) {
        actions.push(
          {
            id: 'report-post',
            name: `Report post ${fragments.cid}`,
            section: ActionSections.actions,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},report,post`,
            subtitle: 'Go to post record and open report panel',
            perform: () => {
              router.push(
                `/repositories/${fragments.did || fragments.handle}/${
                  CollectionId.Post
                }/${fragments.cid}?reportUri=default`,
              )
            },
          },
          {
            id: 'view-post',
            name: `View post ${fragments.cid}`,
            section: ActionSections.details,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},view,post`,
            subtitle: 'Go to post record',
            perform: () => {
              router.push(
                `/repositories/${fragments.did || fragments.handle}/${
                  CollectionId.Post
                }/${fragments.cid}`,
              )
            },
          },
          {
            id: 'search-reports-by-post',
            name: `Reports for post ${fragments.cid}`,
            section: ActionSections.reports,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},search,report,post`,
            subtitle: 'Go to reports page and filter by this post',
            perform: () => {
              router.push(
                `/reports?term=at://${fragments.did || fragments.handle}/${
                  CollectionId.Post
                }/${fragments.cid}`,
              )
            },
          },
        )
      }

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
    } else if (search.startsWith('at://')) {
      const { did, collection, rkey } = parseAtUri(search) || {}
      if (did && collection && rkey) {
        const readableCollection = collection.split('.').pop()
        actions.push(
          {
            id: 'report-post',
            name: `Report ${readableCollection} ${rkey}`,
            section: ActionSections.actions,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},report,post`,
            subtitle: 'Go to post record and open report panel',
            perform: () => {
              router.push(
                `/repositories/${did}/${collection}/${rkey}?reportUri=${search}`,
              )
            },
          },
          {
            id: 'action-post',
            name: `Action ${readableCollection} ${rkey}`,
            section: ActionSections.actions,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},action,post`,
            subtitle: 'Open action panel for post',
            perform: () => {
              router.push(
                `?quickOpen=${AtUri.make(did, collection, rkey).toString()}`,
              )
            },
          },
          {
            id: 'view-post',
            name: `View ${readableCollection} ${rkey}`,
            section: ActionSections.details,
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},view,post`,
            subtitle: 'Go to post record',
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

    if (didFromHandle) {
      actions.push(
        ...buildItemForDid({
          search,
          router,
          handle: search,
          did: didFromHandle,
        }),
      )
    }

    return actions.map(createAction)
  }, [search, didFromHandle])

  useRegisterActions(memoizedActions, [search, didFromHandle])
}
