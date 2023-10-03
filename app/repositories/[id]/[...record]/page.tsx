'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AppBskyFeedGetPostThread as GetPostThread,
  AppBskyGraphGetList as GetList,
} from '@atproto/api'
import { ReportPanel } from '@/reports/ReportPanel'
import { RecordView } from '@/repositories/RecordView'
import client from '@/lib/client'
import { createAtUri } from '@/lib/util'
import { createReport } from '@/repositories/createReport'
import { Loading, LoadingFailed } from '@/common/Loader'
import { CollectionId } from '@/reports/helpers/subject'

export default function Record({
  params,
}: {
  params: { id: string; record: string[] }
}) {
  const id = decodeURIComponent(params.id)
  const collection = params.record[0] && decodeURIComponent(params.record[0])
  const rkey = params.record[1] && decodeURIComponent(params.record[1])
  const [reportUri, setReportUri] = useState<string>()
  const { data, error, refetch } = useQuery({
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
        if (collection !== CollectionId.Post) {
          return undefined
        }
        try {
          const { data: thread } = await client.api.app.bsky.feed.getPostThread(
            { uri },
            { headers: client.adminHeaders() },
          )
          return thread
        } catch (err) {
          if (err instanceof GetPostThread.NotFoundError) {
            return undefined
          }
          throw err
        }
      }
      const getListProfiles = async () => {
        if (collection !== CollectionId.List) {
          return undefined
        }
        // TODO: We need pagination here, right? how come getPostThread doesn't need it?
        const { data: listData } = await client.api.app.bsky.graph.getList({
          list: uri,
        })
        return listData.items.map(({ subject }) => subject)
      }
      const [record, profiles, thread] = await Promise.all([
        getRecord(),
        getListProfiles(),
        getThread(),
      ])
      return { record, thread, profiles }
    },
  })
  if (error) {
    return <LoadingFailed error={error} />
  }
  if (!data) {
    return <Loading />
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
        profiles={data.profiles}
        onReport={setReportUri}
      />
    </>
  )
}
