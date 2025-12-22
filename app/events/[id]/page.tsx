'use client'
import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTitle } from 'react-use'

import { Loading, LoadingFailed } from '@/common/Loader'
import { EventView } from '@/mod-event/View'
import { MOD_EVENT_TITLES } from '@/mod-event/constants'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

export default function EventViewPage(props: {
  params: Promise<{ id: string }>
}) {
  const params = use(props.params)
  const id = decodeURIComponent(params.id)
  const labelerAgent = useLabelerAgent()
  const { data: event, error } = useQuery({
    queryKey: ['event', { id }],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.moderation.getEvent({
        id: parseInt(id, 10),
      })
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
