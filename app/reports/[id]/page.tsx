'use client'
import { useState } from 'react'
import { ReportView } from '../../../components/reports/ReportView'
import { useQuery } from '@tanstack/react-query'
import client from '../../../lib/client'
import { takeActionAndResolveReports } from '../../../components/reports/helpers/takeActionAndResolveReports'
import {
  ModActionFormValues,
  ModActionPanel,
} from '../../actions/ModActionPanel'
import { getSubjectString } from '../../../components/reports/ActionView/getSubjectString'

export default function Report({ params }: { params: { id: string } }) {
  const [resolveReportPanelOpen, setResolveReportPanelOpen] = useState(false)

  const id = decodeURIComponent(params.id)
  const { data: report, refetch } = useQuery({
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

  const subjectString = getSubjectString(report.subject)

  return (
    <>
      <ModActionPanel
        open={resolveReportPanelOpen}
        onClose={() => setResolveReportPanelOpen(false)}
        subject={subjectString}
        subjectOptions={[subjectString]}
        onSubmit={async (vals: ModActionFormValues) => {
          await takeActionAndResolveReports(vals)
          refetch()
        }}
      />
      <ReportView
        report={report}
        setResolveReportPanelOpen={setResolveReportPanelOpen}
      />
    </>
  )
}
