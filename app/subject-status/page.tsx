'use client'
import { useQuery } from '@tanstack/react-query'
import client from '@/lib/client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { useSearchParams } from 'next/navigation'
import { SubjectStatusView } from '@/subject/StatusView'
import { useEffect } from 'react'
import { useTitle } from 'react-use'

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

  let pageTitle = `Subject Status`

  if (data?.subjectStatuses[0]) {
    pageTitle = `${data.subjectStatuses[0].subjectRepoHandle} - ${pageTitle}`
  }

  useTitle(pageTitle)

  if (status === 'loading') {
    return <Loading />
  }

  if (error || !data?.subjectStatuses?.length) {
    return <LoadingFailed error={error} />
  }

  return <SubjectStatusView subjectStatus={data?.subjectStatuses[0]} />
}
