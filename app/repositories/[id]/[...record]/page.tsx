'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppBskyFeedGetPostThread as GetPostThread } from '@atproto/api'
import { ReportPanel } from '../../../../components/reports/ReportPanel'
import { RecordView } from '../../../../components/repositories/RecordView'
import client from '../../../../lib/client'
import { createAtUri } from '../../../../lib/util'
import { createReport } from '../../../../components/repositories/createReport'

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
        const { data } = await client.api.com.atproto.identity.resolveHandle({
          handle: id,
        })
        did = data.did
      }
      const uri = createAtUri({ did, collection, rkey })
      const getRecord = async () => {
        const { data: record } = await client.api.com.atproto.admin.getRecord(
          { uri },
          { headers: client.adminHeaders() },
        )
        return record
      }
      const getThread = async () => {
        if (collection !== 'app.bsky.feed.post') {
          return undefined
        }
        try {
          const { data: thread } = await client.api.app.bsky.feed.getPostThread(
            { uri },
          )
          return thread
        } catch (err) {
          if (err instanceof GetPostThread.NotFoundError) {
            return undefined
          }
          throw err
        }
      }
      const [record, thread] = await Promise.all([getRecord(), getThread()])
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
