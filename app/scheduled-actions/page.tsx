'use client'
import { Suspense } from 'react'
import { ScheduledActionsPageContent } from './page-content'

export default function ScheduledActionsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ScheduledActionsPageContent />
    </Suspense>
  )
}
