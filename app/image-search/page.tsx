'use client'
import { Suspense } from 'react'
import { ImageSearchPageContent } from './page-content'

export default function ImageSearchPage() {
  return (
    <Suspense fallback={<div></div>}>
      <ImageSearchPageContent />
    </Suspense>
  )
}
