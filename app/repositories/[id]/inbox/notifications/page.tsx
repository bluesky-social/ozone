'use client'

import { Suspense, use } from 'react'
import { RepositoryViewPageContent } from '../../page-content'

export default function NotificationsInboxPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <RepositoryViewPageContent
        id={decodeURIComponent(id)}
        inboxSection="notifications"
      />
    </Suspense>
  )
}
