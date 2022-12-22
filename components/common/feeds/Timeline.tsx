'use client'
import { useState, useEffect } from 'react'
import { AppBskyFeedFeedViewPost } from '@atproto/api'
import { useApi } from '../../../lib/client'
import { Posts } from '../posts/Posts'

export function Timeline() {
  const api = useApi()
  const [paginationCursor, setPaginationCursor] = useState<string | undefined>()
  const [needsMore, setNeedsMore] = useState(false)
  const [items, setItems] = useState<AppBskyFeedFeedViewPost.Main[]>([])

  const fetchMore = async () => {
    console.log('fetching')
    try {
      const res = await api?.app.bsky.feed.getTimeline({
        limit: 30,
        before: paginationCursor,
      })
      console.log('done', res)
      if (res?.data) {
        setItems(items.concat(res.data.feed))
        setPaginationCursor(res.data.cursor)
      }
    } catch (e) {
      console.error('Error while fetching firehose', e)
    } finally {
      setNeedsMore(false)
    }
  }

  useEffect(() => {
    if (api && (items.length === 0 || needsMore)) {
      fetchMore()
    }
  }, [api, items.length, needsMore])

  return <Posts items={items} onLoadMore={() => setNeedsMore(true)} />
}
