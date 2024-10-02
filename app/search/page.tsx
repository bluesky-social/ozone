'use client'
import { Suspense } from 'react'
import { SearchPageContent } from './page-content'

export default function SearchHomePage({ searchParams }) {
  return (
    <Suspense fallback={<div></div>}>
      <SearchPageContent
        term={searchParams.term || ''}
        section={searchParams.section}
      />
    </Suspense>
  )
}
