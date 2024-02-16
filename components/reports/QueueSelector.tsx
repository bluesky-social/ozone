import { Dropdown } from '@/common/Dropdown'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export const QUEUES = {
  stratosphere: {
    name: 'Stratosphere',
  },
  troposphere: {
    name: 'Troposphere',
  },
}
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
