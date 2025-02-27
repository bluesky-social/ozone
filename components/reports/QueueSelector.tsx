import { Dropdown } from '@/common/Dropdown'
import { ToolsOzoneModerationDefs } from '@atproto/api/'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useQueueSetting } from 'components/setting/useQueueSetting'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const NoListQueueHeader = () => (
  <h3 className="flex items-center text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
    Queue
  </h3>
)

export const QueueSelector = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isEscalationTab =
    searchParams.get('reviewState') === ToolsOzoneModerationDefs.REVIEWESCALATED
  const queueName = searchParams.get('queueName')
  const { setting: queueSetting } = useQueueSetting()

  const selectQueue = (queue: string) => () => {
    const nextParams = new URLSearchParams(searchParams)
    if (queue) {
      nextParams.set('queueName', queue)
    } else {
      nextParams.delete('queueName')
    }
    router.push((pathname ?? '') + '?' + nextParams.toString())
  }

  // If no queues are configured, just use a static title
  if (queueSetting.isLoading || !queueSetting.data) {
    return <NoListQueueHeader />
  }
  const { queueNames, escalationQueueNames, queueList } = queueSetting.data
  const queueNamesToShow = isEscalationTab ? escalationQueueNames : queueNames

  if (queueNamesToShow.length <= 0) {
    return <NoListQueueHeader />
  }

  return (
    <Dropdown
      containerClassName="inline-block"
      className="inline-flex items-center"
      items={[
        {
          text: 'All',
          onClick: selectQueue(''),
        },
        ...queueNamesToShow.map((q) => ({
          text: queueList.setting[q].name,
          onClick: selectQueue(q),
        })),
      ]}
    >
      <h3 className="capitalize flex items-center text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
        {queueName && queueNamesToShow.includes(queueName)
          ? queueName
          : 'Queue'}
        <ChevronDownIcon
          className="text-gray-900 dark:text-gray-200 h-4 w-4"
          aria-hidden="true"
        />
      </h3>
    </Dropdown>
  )
}
