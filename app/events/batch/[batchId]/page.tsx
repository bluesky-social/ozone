'use client'
import { use } from 'react'
import { ModEventList } from '@/mod-event/EventList'

export default function BatchActions(props: {
  params: Promise<{ batchId: string }>
}) {
  const params = use(props.params)
  const batchId = decodeURIComponent(params.batchId)

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="pt-4 max-w-3xl w-full mx-auto dark:text-gray-100">
        <div className="mb-6">
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Batch ID: {batchId}
          </h1>
        </div>
        <ModEventList batchId={batchId} />
      </div>
    </div>
  )
}
