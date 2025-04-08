'use client'
import { Suspense, use } from 'react'
import { RedirectFromHandleToDid } from '@/repositories/RedirectFromhandleToDid'
import RecordViewPageContent from './page-content'

export default function RecordViewPage(
  props: {
    params: Promise<{ id: string; record: string[] }>
  }
) {
  const params = use(props.params)
  return (
    <Suspense fallback={<div></div>}>
      <RedirectFromHandleToDid handle={params.id} record={params.record}>
        <RecordViewPageContent params={params} />
      </RedirectFromHandleToDid>
    </Suspense>
  )
}
