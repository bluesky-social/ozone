'use client'
import { Suspense } from 'react'
import EventListPageContent from './page-content'

export default function EventListPage() {
  return (
    <Suspense fallback={<div></div>}>
      <EventListPageContent />
    </Suspense>
  )
}
