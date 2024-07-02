'use client'
import { useQuery } from '@tanstack/react-query'
import { Loading, LoadingFailed } from '@/common/Loader'
import { EventView } from '@/mod-event/View'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export default function Action({ params }: { params: { id: string } }) {
  const labelerAgent = useLabelerAgent()
  const id = decodeURIComponent(params.id)

  const { data: action, error } = useQuery({
    queryKey: ['action', { id }],
    queryFn: async () => {
      const { data } = await labelerAgent.api.tools.ozone.moderation.getEvent({
        id: parseInt(id, 10),
      })
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
