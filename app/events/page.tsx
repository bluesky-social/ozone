'use client'
import { Suspense } from 'react'
import EventListPageContent from './page-content'
import { ModEventProvider } from '@/mod-event/ModEventContext'

export default function EventListPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ModEventProvider>
        <EventListPageContent />
      </ModEventProvider>
    </Suspense>
  )
}
