import { useTitle } from 'react-use'
import { ModEventList } from '@/mod-event/EventList'
import { useModEventList } from '@/mod-event/useModEventList'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { WorkspacePanel } from '@/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { unique } from '@/lib/util'
import { validSubjectString } from '@/lib/types'

const REFETCH_INTERVAL = 10 * 1000

export default function EventListPageContent() {
  const emitEvent = useEmitEvent()
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

  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  // Get subjects
  const { modEvents } = useModEventList({
    queryOptions: { refetchInterval: REFETCH_INTERVAL },
  })
  const subjectOptions = unique(
    modEvents.flatMap((report) => validSubjectString(report.subject) ?? []),
  )

  useTitle(`Moderation Events`)

  return (
    <div>
      <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
        <ModEventList queryOptions={{ refetchInterval: REFETCH_INTERVAL }} />
      </div>
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={subjectOptions}
        isInitialLoading={false}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
        }}
      />
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
    </div>
  )
}
