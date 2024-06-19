import { useEffect, useState } from 'react'
import { useTitle } from 'react-use'
import client from '@/lib/client'
import { useSession } from '@/lib/useSession'
import { Tabs, TabView } from '@/common/Tabs'
import { LabelerConfig } from 'components/config/Labeler'
import { MemberConfig } from 'components/config/Member'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { emitEvent } from '@/mod-event/helpers/emitEvent'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'

enum Views {
  Configure,
  Members,
}

export default function ConfigurePageContent() {
  useTitle('Configure')
  const session = useSession()
  useEffect(() => {
    client.reconfigure() // Ensure config is up to date
  }, [])
  const isServiceAccount = !!session && session?.did === session?.config.did
  const [currentView, setCurrentView] = useState<Views>(
    isServiceAccount ? Views.Configure : Views.Members,
  )
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

  if (!session) return null
  const views: TabView<Views>[] = []

  if (isServiceAccount) {
    views.push({
      view: Views.Configure,
      label: 'Configure',
    })
  }
  views.push({
    view: Views.Members,
    label: 'Members',
  })

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <Tabs
        currentView={currentView}
        onSetCurrentView={setCurrentView}
        views={views}
        fullWidth
      />
      {currentView === Views.Configure && (
        <LabelerConfig session={session} isServiceAccount={isServiceAccount} />
      )}
      {currentView === Views.Members && <MemberConfig />}

      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={false}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(vals)
        }}
      />
    </div>
  )
}
