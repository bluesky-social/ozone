'use client'
import { Suspense } from 'react'
import QueuesPageContent from './page-content'

export default function QueuesPage() {
  return (
    <Suspense fallback={<div></div>}>
      <QueuesPageContent />
    </Suspense>
  )
}
