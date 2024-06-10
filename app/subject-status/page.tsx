'use client'
import { Loading, LoadingFailed } from '@/common/Loader'
import { useSearchParams } from 'next/navigation'
import { SubjectStatusView } from '@/subject/StatusView'
import { useTitle } from 'react-use'
import { useSubjectStatus } from '@/subject/useSubjectStatus'

export default function SubjectStatus() {
  const params = useSearchParams()
  const subject = params.get('uri') || params.get('did')
  const { data, status, error } = useSubjectStatus({ subject })

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
