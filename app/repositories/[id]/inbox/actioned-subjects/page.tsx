'use client'

import { use } from 'react'
import { useTitle } from 'react-use'
import { ActionedSubjectsPreview } from '@/repositories/inbox/InboxPreview'

export default function ActionedSubjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const did = decodeURIComponent(id)
  useTitle(`Actioned subjects - ${did}`)
  return <ActionedSubjectsPreview did={did} />
}
