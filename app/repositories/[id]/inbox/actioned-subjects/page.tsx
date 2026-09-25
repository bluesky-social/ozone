'use client'

import { Suspense, use } from 'react'
import { RepositoryViewPageContent } from '../../page-content'

export default function ActionedSubjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const did = decodeURIComponent(id)
  return (
    <Suspense fallback={null}>
      <RepositoryViewPageContent id={did} inboxSection="actioned-subjects" />
    </Suspense>
  )
}
