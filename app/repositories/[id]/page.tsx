'use client'
import { Suspense } from 'react'
import { RepositoryViewPageContent } from './page-content'
import { RedirectFromHandleToDid } from '@/repositories/RedirectFromhandleToDid'

export default function RepositoryViewPage({
  params,
}: {
  params: { id: string }
}) {
  const { id: rawId } = params
  const id = decodeURIComponent(rawId)
  return (
    <Suspense fallback={<div></div>}>
      <RedirectFromHandleToDid handle={id}>
        <RepositoryViewPageContent id={id} />
      </RedirectFromHandleToDid>
    </Suspense>
  )
}
