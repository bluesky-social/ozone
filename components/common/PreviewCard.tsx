import { parseAtUri } from '@/lib/util'
import { CollectionId } from '@/reports/helpers/subject'
import { ReactNode } from 'react'
import { RecordCard, RepoCard } from './RecordCard'

const getPreviewTitleForAtUri = (uri: string): string => {
  let title: string
  const { collection } = parseAtUri(uri) || {}
  if (collection === CollectionId.List) {
    title = 'Reported list'
  } else if (collection === CollectionId.Profile) {
    title = 'Reported profile'
  } else {
    // Default to post
    title = 'Reported post'
  }

  return title
}

export function PreviewCard({
  did,
  title,
}: {
  did: string
  title?: string | ReactNode
}) {
  if (did.startsWith('at://')) {
    const displayTitle = title || getPreviewTitleForAtUri(did)
    return (
      <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
        <p className="text-sm font-medium text-gray-500 mb-3">{displayTitle}</p>
        <RecordCard uri={did} />
      </div>
    )
  }
  if (did.startsWith('did:')) {
    return (
      <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
        <p className="text-sm font-medium text-gray-500 mb-3">
          {title ? title : 'Reported user'}
        </p>
        <RepoCard did={did} />
      </div>
    )
  }

  // No preview, show placeholder
  return (
    <div className="rounded border-2 border-dashed border-gray-300 p-2 mb-3 text-center">
      <span className="text-xs text-gray-400">
        {title ? title : 'Preview placeholder'}
      </span>
    </div>
  )
}
