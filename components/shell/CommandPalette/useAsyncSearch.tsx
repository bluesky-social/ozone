import {
  ChatBubbleLeftIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useKBar, Action, useRegisterActions, createAction } from 'kbar'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import {
  isBlueSkyAppUrl,
  getFragmentsFromBlueSkyAppUrl,
} from '../../../lib/util'

const PostIcon = ChatBubbleLeftIcon
const RepoIcon = UserGroupIcon
const iconClassName = 'h-7 w-7'

// TODO: Improve shortcut
export const useCommandPaletteAsyncSearch = () => {
  const router = useRouter()
  const { search } = useKBar<{ search: string }>((state) => ({
    search: state.searchQuery,
  }))

  const memoizedActions = useMemo(() => {
    const actions: Action[] = []
    if (search?.length < 2) {
      return actions
    }

    if (isBlueSkyAppUrl(search)) {
      const fragments = getFragmentsFromBlueSkyAppUrl(search)

      if (fragments?.did) {
        actions.push(
          {
            id: 'search-reports-by-did',
            name: `Reports for ${fragments.did}`,
            keywords: `${search},search,did`,
            icon: <RepoIcon className={iconClassName} />,
            subtitle: 'Go to reports page and filter by this DID',
            section: 'Report',
            perform: () => {
              router.push(`/reports?term=${fragments.did}`)
            },
          },
          {
            id: 'view-profile-by-did',
            name: `Profile for ${fragments.did}`,
            section: 'Details',
            keywords: `${search},view,did`,
            icon: <RepoIcon className={iconClassName} />,
            subtitle: 'Go to profile page and of this DID',
            perform: () => {
              router.push(`/repositories/${fragments.did}`)
            },
          },
        )
      }

      if (fragments?.handle) {
        actions.push(
          {
            id: 'search-reports-by-handle',
            name: `Reports for @${fragments.handle}`,
            section: 'Report',
            icon: <RepoIcon className={iconClassName} />,
            keywords: `${search},search,handle`,
            subtitle: 'Go to reports page and filter by this handle',
            perform: () => {
              router.push('/reports')
            },
          },
          {
            id: 'view-profile-by-handle',
            name: `Profile for ${fragments.handle}`,
            section: 'Details',
            icon: <RepoIcon className={iconClassName} />,
            keywords: `${search},view,profile,handle`,
            subtitle: 'Go to profile page and of this handle',
            perform: () => {
              router.push(`/repositories/${fragments.handle}`)
            },
          },
        )
      }

      if (fragments?.cid) {
        actions.push(
          {
            id: 'search-reports-by-post',
            name: `Reports for post ${fragments.cid}`,
            section: 'Report',
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},search,report,post`,
            subtitle: 'Go to reports page and filter by this post',
            perform: () => {
              router.push(
                `/reports?term=at://${
                  fragments.did || fragments.handle
                }/app.bsky.feed.post/${fragments.cid}`,
              )
            },
          },
          {
            id: 'view-post',
            name: `View post ${fragments.cid}`,
            section: 'Details',
            icon: <PostIcon className={iconClassName} />,
            keywords: `${search},view,post`,
            subtitle: 'Go to post record',
            perform: () => {
              router.push(
                `/repositories/${
                  fragments.did || fragments.handle
                }/app.bsky.feed.post/${fragments.cid}`,
              )
            },
          },
        )
      }
    }

    return actions.map(createAction)
  }, [search])

  useRegisterActions(memoizedActions, [search])
}
