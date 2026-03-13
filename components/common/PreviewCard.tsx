import { classNames, parseAtUri } from '@/lib/util'
import { CollectionId, getCollectionName } from '@/reports/helpers/subject'
import { LinkIcon, UserIcon } from '@heroicons/react/24/outline'
import { ReactNode, useState } from 'react'
import { CopyButton } from './CopyButton'
import { RecordCard, RepoCard } from './RecordCard'

const PreviewTitleMap = {
  [CollectionId.Post]: 'Reported post',
  [CollectionId.FeedGenerator]: 'Reported feed',
  [CollectionId.List]: 'Reported list',
  [CollectionId.Profile]: 'Reported profile',
  [CollectionId.StarterPack]: 'Reported starter pack',
  [CollectionId.ProfileStatus]: 'Reported profile status',
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

function SubjectTitleWithIcon({
  subject,
  title,
  isAtUri,
}: {
  subject: string
  title: ReactNode
  isAtUri: boolean
}) {
  const [showPopup, setShowPopup] = useState(false)
  const Icon = isAtUri ? LinkIcon : UserIcon

  return (
    <span className="flex items-center gap-2">
      <span>{title}</span>
      <span className="relative inline-block">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowPopup(!showPopup)
          }}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 align-middle"
        >
          <Icon className="h-4 w-4" />
        </button>
        {showPopup && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPopup(false)}
            />
            <div className="absolute left-0 top-6 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-80">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-700 dark:text-gray-200 break-all font-mono flex-1">
                  {subject}
                </span>
                <CopyButton
                  text={subject}
                  labelText="subject "
                  className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 mt-0.5"
                />
              </div>
            </div>
          </>
        )}
      </span>
    </span>
  )
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
      <div className={classNames(`pb-0 mb-3`, className)}>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-50 mb-3">
          <SubjectTitleWithIcon
            subject={subject}
            title={displayTitle}
            isAtUri={true}
          />
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
          <SubjectTitleWithIcon
            subject={subject}
            title={title ? title : 'Reported user'}
            isAtUri={false}
          />
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
