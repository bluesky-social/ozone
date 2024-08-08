import { classNames, parseAtUri } from '@/lib/util'
import { CollectionId, getCollectionName } from '@/reports/helpers/subject'
import { ReactNode } from 'react'
import { RecordCard, RepoCard } from './RecordCard'

const PreviewTitleMap = {
  [CollectionId.Post]: 'Reported post',
  [CollectionId.FeedGenerator]: 'Reported feed',
  [CollectionId.List]: 'Reported list',
  [CollectionId.Profile]: 'Reported profile',
  [CollectionId.StarterPack]: 'Reported starter pack',
}

const getPreviewTitleForAtUri = (uri: string): string => {
  const { collection } = parseAtUri(uri) || {}

  // If the collection is not in the map or collection isn't available, default to post
  return (
    PreviewTitleMap[collection || CollectionId.Post] ||
    (collection
      ? `Reported ${getCollectionName(collection)}`
      : PreviewTitleMap[CollectionId.Post])
  )
}

export function PreviewCard({
  subject,
  title,
  children,
  className,
}: {
  subject: string
  title?: string | ReactNode
  children?: ReactNode
  className?: string
}) {
  if (subject.startsWith('at://')) {
    const displayTitle = title || getPreviewTitleForAtUri(subject)
    return (
      <div className={classNames(`rounded p-2 pb-0 mb-3`, className)}>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-50 mb-3">
          {displayTitle}
        </p>
        <RecordCard uri={subject} />
        {children}
      </div>
    )
  }
  if (subject.startsWith('did:')) {
    return (
      <div className={classNames(`rounded p-2 pb-1 mb-3`, className)}>
        <p className="text-sm font-medium text-gray-500 mb-3">
          {title ? title : 'Reported user'}
        </p>
        <RepoCard did={subject} />
        {children}
      </div>
    )
  }

  // No preview, show placeholder
  return (
    <div className={classNames(`rounded p-2 mb-3 text-center`, className)}>
      <span className="text-xs text-gray-400">
        {title ? title : 'Preview placeholder'}
      </span>
      {children}
    </div>
  )
}
