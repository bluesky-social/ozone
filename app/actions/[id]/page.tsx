'use client'
import { useQuery } from '@tanstack/react-query'
import { ActionView } from '../../../components/reports/ActionView'
import client from '../../../lib/client'

export default function Action({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const { data: action, refetch: actionRefetch } = useQuery({
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
  return <ActionView action={action} refetch={actionRefetch} />
}
