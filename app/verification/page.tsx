'use client'
import { Suspense } from 'react'
import { VerificationPageContent } from './page-content'

export default function VerificationPage() {
  return (
    <Suspense fallback={<div></div>}>
      <VerificationPageContent />
    </Suspense>
  )
}
