import { Card } from '@/common/Card'
import { CopyButton } from '@/common/CopyButton'
import { ClientSession } from '@/lib/client'
import {
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon,
  GlobeAltIcon,
  CloudIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid'

export const ServerConfig = ({ session }: { session: ClientSession }) => {
  const config = session.serverConfig
  if (!config) {
    return <p>No server config found</p>
  }

  return (
    <>
      <h3 className="font-medium text-lg text-gray-700 dark:text-gray-100 my-4">
        Server Config
      </h3>
      <Card>
        <div className="p-2">
          {config.pds && <UrlDisplay label="PDS" url={config.pds} />}
          {config.appview && (
            <UrlDisplay label="App View" url={config.appview} />
          )}
          {config.blobDivert && (
            <UrlDisplay label="Blob Divert" url={config.blobDivert} />
          )}
          {config.chat && <UrlDisplay label="Chat" url={config.chat} />}
          <div className="mt-4">
            <h3 className="font-semibold">Permissions</h3>
            <ul className="mt-2 list-disc list-inside text-gray-900 dark:text-gray-100">
              {' '}
              <PermissionItem
                label="Manage Templates"
                enabled={config.permissions.canManageTemplates}
              />
              <PermissionItem
                label="Takedown"
                enabled={config.permissions.canTakedown}
              />
              <PermissionItem
                label="Label"
                enabled={config.permissions.canLabel}
              />
              <PermissionItem
                label="Manage Chat"
                enabled={config.permissions.canManageChat}
              />
            </ul>
          </div>
        </div>
      </Card>
    </>
  )
}

type PermissionItemProps = {
  label: string
  enabled: boolean
}

const PermissionItem: React.FC<PermissionItemProps> = ({ label, enabled }) => {
  return (
    <li className="flex items-center">
      {enabled ? (
        <CheckCircleIcon className="h-4 w-4 text-green-600" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-red-600" />
      )}
      <span className="ml-2">{label}</span>
    </li>
  )
}

type UrlDisplayProps = {
  label: 'App View' | 'PDS' | 'Blob Divert' | 'Chat'
  url?: string
}

const getIcon = (label: UrlDisplayProps['label'] | string) => {
  switch (label) {
    case 'PDS':
      return <LinkIcon className="h-5 w-5" />
    case 'App View':
      return <GlobeAltIcon className="h-5 w-5" />
    case 'Blob Divert':
      return <CloudIcon className="h-5 w-5" />
    case 'Chat':
      return <ChatBubbleLeftIcon className="h-5 w-5" />
    default:
      return <LinkIcon className="h-5 w-5" />
  }
}

const UrlDisplay: React.FC<UrlDisplayProps> = ({ label, url }) => {
  if (!url) return null
  return (
    <div className="mb-2 flex items-center">
      {getIcon(label)}
      <span className="font-medium ml-2">{label}:</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 mr-1 text-blue-500 dark:text-blue-400 underline"
      >
        {url}
      </a>
      <CopyButton text={url} label={`Copy ${label} URL to clipboard`} />
    </div>
  )
}
