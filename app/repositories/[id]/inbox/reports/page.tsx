'use client'

import { use } from 'react'
import { useTitle } from 'react-use'
import { ReportsPreview } from '@/repositories/inbox/InboxPreview'

export default function ReportsInboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const did = decodeURIComponent(id)
  useTitle(`Reports sent - ${did}`)
  return <ReportsPreview did={did} />
}
