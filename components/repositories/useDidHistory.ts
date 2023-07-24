import { useQuery } from '@tanstack/react-query'

const DIRECTORY_URL = `https://plc.directory`

export const useDidHistory = (did: string) =>
  useQuery({
    queryKey: ['didHistory', { did }],
    cacheTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!did.startsWith('did:plc')) return null

      const url = `${DIRECTORY_URL}/${did}/log`
      const res = await fetch(url)
      return res.json()
    },
  })
