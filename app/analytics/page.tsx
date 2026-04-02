'use client'
import { Suspense } from 'react'
import { AnalyticsPageContent } from './page-content'

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <AnalyticsPageContent />
    </Suspense>
  )
}
