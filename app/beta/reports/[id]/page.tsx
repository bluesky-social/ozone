'use client'
import { Suspense } from 'react'
import ReportDetailContent from './page-content'

export default function ReportDetailPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ReportDetailContent />
    </Suspense>
  )
}
