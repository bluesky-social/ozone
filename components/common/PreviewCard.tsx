import { classNames, parseAtUri } from '@/lib/util'
import { getCollectionName } from '@/reports/helpers/subject'
import { ReactNode } from 'react'
import { RecordCard, RepoCard } from './RecordCard'

const getPreviewTitleForAtUri = (uri: string): string => {
  const { collection } = parseAtUri(uri) || {}

  const userFriendlyCollection = collection ? getCollectionName(collection) : ''

  // If the collection is not known or collection isn't available, default to "post"
  return `Reported ${userFriendlyCollection.toLowerCase() || 'post'}`
}

export function PreviewCard({
  subject,
  title,
  children,
  className,
  isAuthorDeactivated,
  isAuthorTakendown,
}: {
  subject: string
  isAuthorDeactivated?: boolean
  isAuthorTakendown?: boolean
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
        <RecordCard
          uri={subject}
          isAuthorDeactivated={isAuthorDeactivated}
          isAuthorTakendown={isAuthorTakendown}
        />
        {children}
      </div>
    )
  }
  if (subject.startsWith('did:')) {
    return (
      <div className={classNames(`rounded p-2 pb-1 mb-3`, className)}>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-50 mb-3">
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
