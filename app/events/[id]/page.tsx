'use client'
import { useQuery } from '@tanstack/react-query'
import { useTitle } from 'react-use'
import client from '@/lib/client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { EventView } from '@/mod-event/View'
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

  let pageTitle = `Moderation Event #${id}`
  if (event) {
    const eventTitle =
      MOD_EVENT_TITLES[event.event.$type as string] || 'Moderation'
    pageTitle = `${eventTitle} Event #${id}`
  }
  useTitle(pageTitle)

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
