'use client'
import { Suspense } from 'react'
import { StatsDetailPageContent } from './page-content'

export default function StatsDetailPage() {
  return (
    <Suspense fallback={<div></div>}>
      <StatsDetailPageContent />
    </Suspense>
  )
}
