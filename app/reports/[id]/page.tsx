'use client'
import { ReportView } from '../../../components/reports/ReportView'
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

  return <ReportView report={report} />
}
