'use client'
import { useQuery } from '@tanstack/react-query'
import {
  AppBskyFeedGetPostThread as GetPostThread,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { ReportPanel } from '@/reports/ReportPanel'
import { RecordView } from '@/repositories/RecordView'
import client from '@/lib/client'
import { createAtUri } from '@/lib/util'
import { createReport } from '@/repositories/createReport'
import { Loading, LoadingFailed } from '@/common/Loader'
import { CollectionId } from '@/reports/helpers/subject'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { emitEvent } from '@/mod-event/helpers/emitEvent'
import { useEffect } from 'react'
import { useTitle } from 'react-use'
import { getDidFromHandle } from '@/lib/identity'

const buildPageTitle = ({
  handle,
  collection,
  rkey,
}: {
  handle?: string
  collection?: string
  rkey?: string
}) => {
  let title = `Record Details`

  if (collection) {
    const titleFromCollection = collection.split('.').pop()
    if (titleFromCollection) {
      title =
        titleFromCollection[0].toUpperCase() + titleFromCollection.slice(1)
    }
  }

  if (handle) {
    title += ` - ${handle}`
  }

  if (rkey) {
    title += ` - ${rkey}`
  }
  return title
}

export default function RecordViewPageContent({
  params,
}: {
  params: { id: string; record: string[] }
}) {
  const id = decodeURIComponent(params.id)
  const collection = params.record[0] && decodeURIComponent(params.record[0])
  const rkey = params.record[1] && decodeURIComponent(params.record[1])
  const {
    data,
    error,
    refetch,
    isLoading: isInitialLoading,
  } = useQuery({
    queryKey: ['record', { id, collection, rkey }],
    queryFn: async () => {
      let did: string | null
      if (id.startsWith('did:')) {
        did = id
      } else {
        did = await getDidFromHandle(id)
      }
      if (!did) {
        throw new Error('Failed to resolve DID for the record')
      }

      const uri = createAtUri({ did, collection, rkey })
      const getRecord = async () => {
        const { data: record } =
          await client.api.tools.ozone.moderation.getRecord(
            { uri },
            { headers: client.proxyHeaders() },
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
            { headers: client.proxyHeaders() },
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
        const { data: listData } = await client.api.app.bsky.graph.getList(
          {
            list: uri,
          },
          { headers: client.proxyHeaders() },
        )
        return listData.items.map(({ subject }) => subject)
      }
      const [record, profiles, thread] = await Promise.allSettled([
        getRecord(),
        getListProfiles(),
        getThread(),
      ])
      return {
        record: record.status === 'fulfilled' ? record.value : undefined,
        thread: thread.status === 'fulfilled' ? thread.value : undefined,
        profiles: profiles.status === 'fulfilled' ? profiles.value : undefined,
      }
    },
  })

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const reportUri = searchParams.get('reportUri') || undefined
  const setQuickActionPanelSubject = (subject: string) => {
    // This route should not have any search params but in case it does, let's make sure original params are maintained
    const newParams = new URLSearchParams(searchParams)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }
  const setReportUri = (uri?: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (uri) {
      newParams.set('reportUri', uri)
    } else {
      newParams.delete('reportUri')
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  useEffect(() => {
    if (reportUri === 'default' && data?.record) {
      setReportUri(data?.record.uri)
    }
  }, [data, reportUri])

  const pageTitle = buildPageTitle({
    handle: data?.record?.repo.handle,
    rkey,
    collection,
  })
  useTitle(pageTitle)

  if (error) {
    return <LoadingFailed error={error} />
  }
  if (!data && isInitialLoading) {
    return <Loading />
  }
  return (
    <>
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={isInitialLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(vals)
          refetch()
        }}
      />
      <ReportPanel
        open={!!reportUri}
        onClose={() => setReportUri(undefined)}
        subject={reportUri}
        onSubmit={async (vals) => {
          await createReport(vals)
          refetch()
        }}
      />
      {data?.record && (
        <RecordView
          record={data.record}
          thread={data.thread}
          profiles={data.profiles}
          onReport={setReportUri}
          onShowActionPanel={(subject) => setQuickActionPanelSubject(subject)}
        />
      )}
    </>
  )
}
