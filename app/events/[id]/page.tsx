'use client'
import { useQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { EventView } from '@/mod-event/View'

export default function EventViewPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const {
    data: event,
    error,
  } = useQuery({
    queryKey: ['event', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationEvent(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })

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
