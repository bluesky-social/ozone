import { useEffect } from 'react'
import { useTitle } from 'react-use'
import { Tabs, TabView } from '@/common/Tabs'
import { LabelerConfig } from 'components/config/Labeler'
import { MemberConfig } from 'components/config/Member'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { WorkspacePanel } from '@/workspace/Panel'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { SetsConfig } from '@/config/Sets'
import { ProtectedTagsConfig } from '@/config/ProtectedTags'
import { PoliciesConfig } from '@/config/Policies'
import { SafelinkConfig } from '@/config/Safelink'

enum Views {
  Configure,
  Members,
  Sets,
  Safelink,
  ProtectedTags,
  Policies,
}

const TabKeys = {
  configure: Views.Configure,
  members: Views.Members,
  sets: Views.Sets,
  safelink: Views.Safelink,
  protectedTags: Views.ProtectedTags,
  policies: Views.Policies,
}

export default function ConfigurePageContent() {
  useTitle('Configure')

  const { reconfigure } = useConfigurationContext()
  useEffect(() => void reconfigure(), [reconfigure]) // Ensure config is up to date

  const emitEvent = useEmitEvent()

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentView =
    TabKeys[searchParams.get('tab') || 'details'] || TabKeys.configure
  const setCurrentView = (view: Views) => {
    const newParams = new URLSearchParams(searchParams)
    const newTab = Object.entries(TabKeys).find(([, v]) => v === view)?.[0]
    newParams.set('tab', newTab || 'details')
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
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

  const views: TabView<Views>[] = [
    {
      view: Views.Configure,
      label: 'Configure',
    },
    {
      view: Views.Members,
      label: 'Members',
    },
    {
      view: Views.Sets,
      label: 'Sets',
    },
    {
      view: Views.Safelink,
      label: 'Safelink',
    },
    {
      view: Views.Policies,
      label: 'Policies',
    },
    {
      view: Views.ProtectedTags,
      label: 'Protected Tags',
    },
  ]

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <Tabs
        currentView={currentView}
        onSetCurrentView={setCurrentView}
        views={views}
        fullWidth
      />
      {currentView === Views.Configure && <LabelerConfig />}
      {currentView === Views.Members && <MemberConfig />}
      {currentView === Views.Sets && <SetsConfig />}
      {currentView === Views.Safelink && <SafelinkConfig />}
      {currentView === Views.ProtectedTags && <ProtectedTagsConfig />}
      {currentView === Views.Policies && <PoliciesConfig />}

      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
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
