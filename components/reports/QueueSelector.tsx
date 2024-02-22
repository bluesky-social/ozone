import { Dropdown } from '@/common/Dropdown'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type QueueConfig = Record<string, { name: string }>

const getQueueConfig = () => {
  const config = process.env.NEXT_PUBLIC_QUEUE_CONFIG || '{}'
  try {
    return JSON.parse(config) as QueueConfig
  } catch (err) {
    return {}
  }
}

export const QUEUES = getQueueConfig()
export const QUEUE_NAMES = Object.keys(QUEUES)

export const QueueSelector = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queueName = searchParams.get('queueName')

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
  if (!QUEUE_NAMES.length) {
    return (
      <h3 className="flex items-center text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
        Queue
      </h3>
    )
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
        ...QUEUE_NAMES.map((q) => ({
          text: QUEUES[q].name,
          onClick: selectQueue(q),
        })),
      ]}
    >
      <h3 className="flex items-center text-lg font-medium leading-6 text-gray-900 dark:text-gray-200">
        {queueName ? `${QUEUES[queueName].name} Queue` : 'Queue'}
        <ChevronDownIcon
          className="text-gray-900 dark:text-gray-200 h-4 w-4"
          aria-hidden="true"
        />
      </h3>
    </Dropdown>
  )
}
