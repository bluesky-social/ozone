'use client'
import { Suspense } from 'react'
import { RedirectFromHandleToDid } from '@/repositories/RedirectFromhandleToDid'
import RecordViewPageContent from './page-content'

export default function RecordViewPage({
  params,
}: {
  params: { id: string; record: string[] }
}) {
  return (
    <Suspense fallback={<div></div>}>
      <RedirectFromHandleToDid handle={params.id}>
        <RecordViewPageContent params={params} />
      </RedirectFromHandleToDid>
    </Suspense>
  )
}
