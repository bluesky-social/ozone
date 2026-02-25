'use client'
import { Suspense } from 'react'
import QueueDetailContent from './page-content'

export default function QueueDetailPage() {
  return (
    <Suspense fallback={<div></div>}>
      <QueueDetailContent />
    </Suspense>
  )
}
