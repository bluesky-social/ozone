'use client'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useTitle } from 'react-use'

import { Loading, LoadingFailed } from '@/common/Loader'
import { SubjectStatusView } from '@/subject/StatusView'

export default function SubjectStatus() {
  const params = useSearchParams()
  const labelerAgent = useLabelerAgent()

  const subject = params.get('uri') || params.get('did')
  const { data, error, isLoading } = useQuery({
    queryKey: ['moderationStatus', { subject }],
    queryFn: async () => {
      if (!subject) return null
      const { data } =
        await labelerAgent.api.tools.ozone.moderation.queryStatuses({
          subject,
          limit: 1,
        })
      return data
    },
  })

  let pageTitle = `Subject Status`

  if (data?.subjectStatuses[0]) {
    pageTitle = `${data.subjectStatuses[0].subjectRepoHandle} - ${pageTitle}`
  }

  useTitle(pageTitle)

  if (isLoading) {
    return <Loading />
  }

  if (error || !data?.subjectStatuses?.length) {
    return <LoadingFailed error={error} />
  }

  return <SubjectStatusView subjectStatus={data?.subjectStatuses[0]} />
}
