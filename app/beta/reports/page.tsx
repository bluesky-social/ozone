'use client'
import { Suspense } from 'react'
import ReportsPageContent from './page-content'

export default function ReportsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ReportsPageContent />
    </Suspense>
  )
}
