'use client'
import { useQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { EventView } from '@/mod-event/View'

export default function Action({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)

  const { data: action, error } = useQuery({
    queryKey: ['action', { id }],
    queryFn: async () => {
      const { data } = await client.api.tools.ozone.moderation.getEvent(
        {
          id: parseInt(id, 10),
        },
        { headers: client.proxyHeaders() },
      )
      return data
    },
  })
  if (error) {
    return <LoadingFailed error={error} />
  }
  if (!action) {
    return <Loading />
  }
  return <EventView event={action} />
}
