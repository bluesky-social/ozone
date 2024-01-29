import { ModEventList } from '@/mod-event/EventList'
import { emitEvent } from '@/mod-event/helpers/emitEvent'
import { ComAtprotoAdminEmitModerationEvent } from '@atproto/api'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function EventListPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const setQuickActionPanelSubject = (subject: string) => {
    const newParams = new URLSearchParams(document.location.search)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  useEffect(() => {
    document.title = `Moderation Events`
  }, [])

  return (
    <div>
      <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4">
        <ModEventList queryOptions={{ refetchInterval: 10 * 1000 }} />
      </div>
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={false}
        onSubmit={async (
          vals: ComAtprotoAdminEmitModerationEvent.InputSchema,
        ) => {
          await emitEvent(vals)
        }}
      />
    </div>
  )
}
