'use client'
import { useQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { EventView } from '@/mod-event/View'
import { useEffect } from 'react'
import { MOD_EVENT_TITLES } from '@/mod-event/constants'

export default function EventViewPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const { data: event, error } = useQuery({
    queryKey: ['event', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationEvent(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })

  // Change page title dynamically
  // Use a human-readable event name once event details are fetched
  useEffect(() => {
    if (event) {
      const eventTitle =
        MOD_EVENT_TITLES[event.event.$type as string] || 'Moderation'
      document.title = `${eventTitle} Event #${id}`
    } else {
      document.title = `Moderation Event #${id}`
    }
  }, [id, event])

  if (error) {
    return <LoadingFailed error={error} />
  }

  if (!event) {
    return <Loading />
  }

  return (
    <>
      <EventView event={event} />
    </>
  )
}
