import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input, Select } from '@/common/forms'
import { useQueueSetting } from './useQueueSetting'
import { FormEvent, useRef } from 'react'
import dynamic from 'next/dynamic'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { isRoleSuperiorOrSame, MemberRoleNames } from 'components/team/helpers'

const BrowserReactJsonView = dynamic(() => import('react-json-view'), {
  ssr: false,
})

export const QueueSetting = () => {
  const { setting: queueSetting, upsert: upsertQueueSetting } =
    useQueueSetting()
  const darkMode = isDarkModeEnabled()
  const queueListRef = useRef<HTMLInputElement>(null)
  const { role } = useServerConfig()

  const canManageQueueSeed =
    (queueSetting.data?.queueSeed &&
      !queueSetting.data.queueSeed.managerRole) ||
    (!!role &&
      !!queueSetting.data?.queueSeed.managerRole &&
      isRoleSuperiorOrSame(role, queueSetting.data?.queueSeed.managerRole))

  const canManageQueueList =
    (queueSetting.data?.queueList &&
      !queueSetting.data.queueList.managerRole) ||
    (!!role &&
      !!queueSetting.data?.queueList.managerRole &&
      isRoleSuperiorOrSame(role, queueSetting.data?.queueList.managerRole))

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
              const queueSeedManagerRole = e.target.queueSeedManagerRole.value
              const queueSeedSetting = e.target.queueSeed.value
              const queueListSetting = JSON.parse(
                e.target.queueList.value || {},
              )
              const queueListManagerRole = e.target.queueListManagerRole.value

              await upsertQueueSetting.mutateAsync({
                queueSeed: {
                  setting: queueSeedSetting,
                  managerRole: queueSeedManagerRole,
                },
                queueList: {
                  setting: queueListSetting,
                  managerRole: queueListManagerRole,
                },
              })
              e.target.reset()
            }}
          >
            <FormLabel label="Queue Seed" className="mb-2" />
            <div className="flex flex-row gap-2">
              <FormLabel
                label="Manager Role"
                htmlFor="queueSeedManagerRole"
                className="mb-2"
              >
                <Select
                  required
                  id="queueSeedManagerRole"
                  name="queueSeedManagerRole"
                  disabled={!canManageQueueSeed || upsertQueueSetting.isLoading}
                >
                  {Object.entries(MemberRoleNames).map(([role, name]) => (
                    <option
                      key={role}
                      value={role}
                      selected={
                        queueSetting.data?.queueSeed.managerRole === role
                      }
                    >
                      {name}
                    </option>
                  ))}
                </Select>
              </FormLabel>
              <FormLabel
                label="Value"
                htmlFor="queueSeed"
                className="flex-1 mb-3"
              >
                <Input
                  required
                  type="text"
                  id="queueSeed"
                  name="queueSeed"
                  defaultValue={queueSetting.data?.queueSeed.setting}
                  placeholder="Queue seeder for balancing"
                  className="block w-full"
                  disabled={!canManageQueueSeed}
                />
              </FormLabel>
            </div>

            <FormLabel label="Queue List" className="my-2" />

            <FormLabel
              label="Manager Role"
              htmlFor="queueListManagerRole"
              className="flex-1 mb-2"
            >
              <Select
                required
                id="queueListManagerRole"
                name="queueListManagerRole"
                disabled={!canManageQueueSeed || upsertQueueSetting.isLoading}
              >
                {Object.entries(MemberRoleNames).map(([role, name]) => (
                  <option
                    key={role}
                    value={role}
                    selected={queueSetting.data?.queueList.managerRole === role}
                  >
                    {name}
                  </option>
                ))}
              </Select>
            </FormLabel>

            <FormLabel
              label="Configure Queues"
              htmlFor="queueList"
              className="flex-1 mb-3"
            />
            <input
              type="hidden"
              name="queueList"
              ref={queueListRef}
              value={JSON.stringify(queueSetting.data?.queueList.setting || {})}
            />
            <BrowserReactJsonView
              src={queueSetting.data?.queueList.setting || {}}
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
