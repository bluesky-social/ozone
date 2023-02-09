'use client'
import { useQuery } from '@tanstack/react-query'
import client from '../../../lib/client'

export default function Report({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const { data: report } = useQuery({
    queryKey: ['report', { id }],
    queryFn: async () => {
      const { data } = await client.api.com.atproto.admin.getModerationReport(
        { id: parseInt(id, 10) },
        { headers: client.adminHeaders() },
      )
      return data
    },
  })
  if (!report) {
    return null
  }
  // Just some temp UI!
  return <pre className="text-sm m-4">{JSON.stringify(report, null, 2)}</pre>
}
