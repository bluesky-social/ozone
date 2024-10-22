import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input } from '@/common/forms'
import { useQueueSetting } from './useQueueSetting'
import { FormEvent, useRef } from 'react'
import dynamic from 'next/dynamic'
import { isDarkModeEnabled } from '@/common/useColorScheme'

const BrowserReactJsonView = dynamic(() => import('react-json-view'), {
  ssr: false,
})

export const QueueSetting = () => {
  const { setting: queueSetting, upsert: upsertQueueSetting } =
    useQueueSetting()
  const darkMode = isDarkModeEnabled()
  const queueListRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <div className="flex flex-row justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Queue Setting
        </h4>
      </div>
      <Card className="mb-4 pb-4">
        <div className="p-2">
          <form
            onSubmit={async (
              e: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
            ) => {
              e.preventDefault()
              const queueSeed = e.target.queueSeed.value
              const queueList = JSON.parse(e.target.queueList.value || {})
              await upsertQueueSetting.mutateAsync({ queueSeed, queueList })
              e.target.reset()
            }}
          >
            <FormLabel
              label="Queue Seed"
              htmlFor="queueSeed"
              className="flex-1 mb-3"
            >
              <Input
                required
                type="text"
                id="queueSeed"
                name="queueSeed"
                defaultValue={queueSetting.data?.queueSeed}
                placeholder="Queue seeder for balancing"
                className="block w-full"
              />
            </FormLabel>

            <FormLabel
              label="Queues"
              htmlFor="queueList"
              className="flex-1 mb-3"
            />
            <input
              type="hidden"
              name="queueList"
              ref={queueListRef}
              value={JSON.stringify(queueSetting.data?.queueList || {})}
            />
            <BrowserReactJsonView
              src={queueSetting.data?.queueList || {}}
              theme={darkMode ? 'harmonic' : 'rjv-default'}
              name={null}
              quotesOnKeys={false}
              displayObjectSize={false}
              displayDataTypes={false}
              enableClipboard={false}
              onEdit={(edit) => {
                if (queueListRef.current)
                  queueListRef.current.value = JSON.stringify(edit.updated_src)
              }}
              onAdd={(add) => {
                if (queueListRef.current)
                  queueListRef.current.value = JSON.stringify(add.updated_src)
              }}
              onDelete={(del) => {
                if (queueListRef.current)
                  queueListRef.current.value = JSON.stringify(del.updated_src)
              }}
            />
            <div className="mt-3 mb-2 flex flex-row justify-end">
              <ActionButton appearance="primary" size="sm" type="submit">
                Save Setting
              </ActionButton>
            </div>
          </form>
        </div>
      </Card>
    </>
  )
}
