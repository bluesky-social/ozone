import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUEUE_CONFIG } from '@/lib/constants'
import { toast } from 'react-toastify'

type QueueConfig = Record<string, { name: string }>

const getQueueConfig = () => {
  const config = QUEUE_CONFIG
  try {
    return JSON.parse(config) as QueueConfig
  } catch (err) {
    return {}
  }
}

export const useQueueSetting = () => {
  const queryClient = useQueryClient()
  const serverConfig = useServerConfig()
  const labelerAgent = useLabelerAgent()
  const setting = useQuery({
    queryKey: ['queue-setting'],
    queryFn: async () => {
      const { data } = await labelerAgent.tools.ozone.setting.listOptions({
        scope: 'instance',
        keys: [
          'tools.ozone.setting.client.queue.list',
          'tools.ozone.setting.client.queue.seed',
        ],
      })

      let queueList: {
        managerRole: string | null
        setting: QueueConfig
      } = { managerRole: null, setting: getQueueConfig() }
      let queueSeed: {
        managerRole: string | null
        setting: string
      } = { managerRole: null, setting: '' }

      data.options.forEach((option) => {
        if (option.key === 'tools.ozone.setting.client.queue.list') {
          queueList = {
            managerRole: option.managerRole || null,
            setting: option.value as QueueConfig,
          }
        }
        if (option.key === 'tools.ozone.setting.client.queue.seed') {
          queueSeed = {
            managerRole: option.managerRole || null,
            setting: option.value?.['val'],
          }
        }
      })

      return {
        queueList,
        queueSeed,
        queueNames: Object.keys(queueList.setting),
      }
    },
  })

  const upsert = useMutation({
    mutationKey: ['queue-setting', 'upsert'],
    mutationFn: async (payload: {
      queueList?: { managerRole: string; setting: QueueConfig }
      queueSeed: { managerRole: string; setting: string }
    }) => {
      const actions = [
        payload.queueList
          ? labelerAgent.tools.ozone.setting.upsertOption({
              value: payload.queueList.setting,
              scope: 'instance',
              managerRole: payload.queueList.managerRole,
              key: 'tools.ozone.setting.client.queue.list',
            })
          : Promise.resolve(),
        payload.queueSeed
          ? labelerAgent.tools.ozone.setting.upsertOption({
              value: { val: payload.queueSeed.setting },
              scope: 'instance',
              managerRole: payload.queueSeed.managerRole,
              key: 'tools.ozone.setting.client.queue.seed',
            })
          : Promise.resolve(),
      ]

      await Promise.all(actions)
    },

    onSuccess: () => {
      queryClient.invalidateQueries(['queue-setting'])
      toast.success('Queue setting saved')
    },

    onError: (error) => {
      toast.error(`Failed to save queue setting: ${error?.['message']}`)
    },
  })

  return { setting, upsert }
}
