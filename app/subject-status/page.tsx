'use client'
import { useQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { useSearchParams } from 'next/navigation'
import { SubjectStatusView } from '@/subject/StatusView'

export default function SubjectStatus() {
  const params = useSearchParams()
  const subject = params.get('uri') || params.get('did')
  const { data, error, status } = useQuery({
    queryKey: ['moderationStatus', { subject }],
    queryFn: async () => {
      if (!subject) return null
      const { data } =
        await client.api.com.atproto.admin.queryModerationStatuses(
          { subject, limit: 1 },
          { headers: client.adminHeaders() },
        )
      return data
    },
  })

  if (status === 'loading') {
    return <Loading />
  }

  if (error || !data?.subjectStatuses?.length) {
    return <LoadingFailed error={error} />
  }

  return <SubjectStatusView subjectStatus={data?.subjectStatuses[0]} />
}
