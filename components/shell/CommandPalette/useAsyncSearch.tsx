import { useKBar, Action, useRegisterActions, createAction } from 'kbar'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import {
  isBlueSkyAppUrl,
  getFragmentsFromBlueSkyAppUrl,
} from '../../../lib/util'

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
            shortcut: ['1'],
            keywords: `${search},search,did`,
            subtitle: 'Go to reports page and filter by this DID',
            perform: () => {
              router.push(`/reports?term=${fragments.did}`)
            },
          },
          {
            id: 'view-profile-by-did',
            name: `Profile for ${fragments.did}`,
            shortcut: ['2'],
            keywords: `${search},view,did`,
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
            shortcut: ['3'],
            keywords: `${search},search,handle`,
            subtitle: 'Go to reports page and filter by this DID',
            perform: () => {
              router.push('/reports')
            },
          },
          {
            id: 'view-profile-by-handle',
            name: `Profile for ${fragments.handle}`,
            shortcut: ['4'],
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
            name: `Reports for @${fragments.cid}`,
            shortcut: ['5'],
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
            shortcut: ['6'],
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
