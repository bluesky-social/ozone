import { ReactNode } from 'react'
import { RecordCard, RepoCard } from './RecordCard'

export function PreviewCard({
  did,
  title,
}: {
  did: string
  title?: string | ReactNode
}) {
  if (did.startsWith('at://')) {
    return (
      <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
        <p className="text-sm font-medium text-gray-500 mb-3">
          {title ? title : 'Reported post'}
        </p>

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
