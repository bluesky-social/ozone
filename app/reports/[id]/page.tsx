'use client'
import { Suspense } from 'react'
import { ReportDetailPageContent } from './page-content'

export default function ReportDetailPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ReportDetailPageContent />
    </Suspense>
  )
}
