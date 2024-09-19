'use client'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useSearchParams } from 'next/navigation'
import { useTitle } from 'react-use'
import { useSubjectStatus } from '@/subject/useSubjectStatus'

import { Loading, LoadingFailed } from '@/common/Loader'
import { SubjectStatusView } from '@/subject/StatusView'

export default function SubjectStatus() {
  const params = useSearchParams()
  const labelerAgent = useLabelerAgent()

  const subject = params.get('uri') || params.get('did')
  const { data, isLoading, error } = useSubjectStatus({ subject })

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
