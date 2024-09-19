import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { CopyButton } from '@/common/CopyButton'
import {
  useConfigurationContext,
  useServerConfig,
} from '@/shell/ConfigurationContext'
import {
  CheckCircleIcon,
  XCircleIcon,
  LinkIcon,
  GlobeAltIcon,
  CloudIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid'
import { useMutation } from '@tanstack/react-query'

const RefetchConfigButton = () => {
  const { reconfigure } = useConfigurationContext()
  const updateRecord = useMutation({ mutationFn: async () => reconfigure() })

  return (
    <ActionButton
      onClick={() => updateRecord.mutate()}
      size="xs"
      disabled={updateRecord.isLoading}
      appearance="outlined"
    >
      {updateRecord.isLoading ? 'Refetching...' : 'Refetch'}
    </ActionButton>
  )
}

export const ServerConfig = () => {
  const config = useServerConfig()

  return (
    <>
      <div className="flex flex-row justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Server Config
        </h4>
        <RefetchConfigButton />
      </div>
      <Card className="mb-4 pb-4">
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
                label="Takedown Feed Generators"
                enabled={config.permissions.canTakedownFeedGenerators}
              />
              <PermissionItem
                label="Label"
                enabled={config.permissions.canLabel}
              />
              <PermissionItem
                label="Manage Chat"
                enabled={config.permissions.canManageChat}
              />
              <PermissionItem
                label="Manage Team"
                enabled={config.permissions.canManageTeam}
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
  const classNames = 'h-5 w-5 text-gray-800 dark:text-gray-300'
  switch (label) {
    case 'PDS':
      return <LinkIcon className={classNames} />
    case 'App View':
      return <GlobeAltIcon className={classNames} />
    case 'Blob Divert':
      return <CloudIcon className={classNames} />
    case 'Chat':
      return <ChatBubbleLeftIcon className={classNames} />
    default:
      return <LinkIcon className={classNames} />
  }
}

const UrlDisplay: React.FC<UrlDisplayProps> = ({ label, url }) => {
  if (!url) return null
  return (
    <div className="mb-2 flex items-center">
      {getIcon(label)}
      <span className="font-medium ml-2 text-gray-900 dark:text-gray-200">
        {label}:
      </span>
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
