'use client'
import { Suspense, use } from 'react'
import { RepositoryViewPageContent } from './page-content'
import { RedirectFromHandleToDid } from '@/repositories/RedirectFromhandleToDid'

export default function RepositoryViewPage(props: {
  params: Promise<{ id: string }>
}) {
  const params = use(props.params)
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
