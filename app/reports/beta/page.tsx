'use client'
import { Suspense } from 'react'
import { BetaReportsPageContent } from './page-content'

export default function BetaReportsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <BetaReportsPageContent />
    </Suspense>
  )
}
