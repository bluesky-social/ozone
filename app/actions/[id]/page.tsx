'use client'
import { useQuery } from '@tanstack/react-query'
import client from '../../../lib/client'

export default function Action({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const { data: action } = useQuery({
    queryKey: ['action', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationAction(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  if (!action) {
    return null
  }
  // Just some temp UI!
  return <pre className="text-sm m-4">{JSON.stringify(action, null, 2)}</pre>
}
