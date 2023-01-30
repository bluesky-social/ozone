'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ReportFormValues,
  ReportPanel,
} from '../../../../components/reports/ReportPanel'
import { RecordView } from '../../../../components/repositories/RecordView'
import client from '../../../../lib/client'
import { createAtUri } from '../../../../lib/util'

export default function Record({
  params,
}: {
  params: { id: string; record: string[] }
}) {
  const id = decodeURIComponent(params.id)
  const collection = params.record[0] && decodeURIComponent(params.record[0])
  const rkey = params.record[1] && decodeURIComponent(params.record[1])
  const [reportUri, setReportUri] = useState<string>()
  const { data, refetch } = useQuery({
    queryKey: ['record', { id, collection, rkey }],
    queryFn: async () => {
      let did: string
      if (id.startsWith('did:')) {
        did = id
      } else {
        const { data } = await client.api.com.atproto.handle.resolve({
          handle: id,
        })
        did = data.did
      }
      const uri = createAtUri({ did, collection, rkey })
      const [{ data: record }, { data: thread }] = await Promise.all([
        client.api.com.atproto.admin.getRecord(
          { uri },
          { headers: client.adminHeaders() },
        ),
        collection === 'app.bsky.feed.post'
          ? client.api.app.bsky.feed.getPostThread({ uri })
          : { data: undefined },
      ])
      return { record, thread }
    },
  })
  if (!data) {
    return null
  }
  return (
    <>
      <ReportPanel
        open={!!reportUri}
        onClose={() => setReportUri(undefined)}
        subject={reportUri}
        onSubmit={async (vals) => {
          await createReport(vals)
          refetch()
        }}
      />
      <RecordView
        record={data.record}
        thread={data.thread}
        onReport={setReportUri}
      />
    </>
  )
}

async function createReport(vals: ReportFormValues) {
  await client.api.com.atproto.report.create({
    ...vals,
    subject: vals.subject.startsWith('at://')
      ? {
          $type: 'com.atproto.repo.recordRef',
          uri: vals.subject,
        }
      : {
          $type: 'com.atproto.repo.repoRef',
          did: vals.subject,
        },
  })
}
