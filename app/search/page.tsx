'use client'
import { Suspense } from 'react'
import { SearchPageContent } from './page-content'

export default function SearchHomePage() {
  return (
    <Suspense fallback={<div></div>}>
      <SearchPageContent />
    </Suspense>
  )
}
