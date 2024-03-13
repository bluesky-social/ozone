'use client'
import { Suspense } from 'react'
import ConfigurePageContent from './page-content'

export default function ConfigurePage() {
  return (
    <Suspense fallback={<div></div>}>
      <ConfigurePageContent />
    </Suspense>
  )
}
