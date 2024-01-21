'use client'
import { Suspense } from 'react'
import { RepositoryViewPageContent } from './page-content'

export default function RepositoryViewPage({ params }: { params: { id: string } }) {
  const { id: rawId } = params
  const id = decodeURIComponent(rawId)
  return (
    <Suspense fallback={<div></div>}>
      <RepositoryViewPageContent id={id} />
    </Suspense>
  )
}
