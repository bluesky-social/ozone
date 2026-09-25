'use client'

import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTitle } from 'react-use'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import { WorkspacePanel } from '@/workspace/Panel'

import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import { AccountView } from '@/repositories/AccountView'
import { useCreateReport } from '@/repositories/createReport'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'

const buildPageTitle = ({
  handle,
  tab,
}: {
  handle: string
  tab: string | null
}) => {
  let title = `Repository Details`
  const titleFragments: string[] = [title]
  const titleFromTab = tab ? tab[0].toUpperCase() + tab.slice(1) : ''

  if (titleFromTab) {
    titleFragments.unshift(titleFromTab)
  }

  if (handle) {
    titleFragments.unshift(handle)
  }

  return titleFragments.join(' - ')
}
export function RepositoryViewPageContent({
  id,
  inboxSection,
}: {
  id: string
  inboxSection?: 'reports' | 'actioned-subjects'
}) {
  const {
    error,
    data: { repo, profile } = {},
    refetch,
    isLoading: isInitialLoading,
  } = useRepoAndProfile({ id })

  const createReport = useCreateReport()
  const emitEvent = useEmitEvent()
  const queryClient = useQueryClient()
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
  const tab = inboxSection ? 'Mod Inbox' : searchParams.get('tab')
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()

  const pageTitle = buildPageTitle({
    handle: profile?.handle || repo?.handle || id,
    tab,
  })
  useTitle(pageTitle)

  return (
    <>
      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={isInitialLoading}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
          refetch()
          await queryClient.invalidateQueries({
            queryKey: ['moderatorInboxPreview'],
          })
          await queryClient.invalidateQueries({ queryKey: ['inboxActionDetail'] })
          await queryClient.invalidateQueries({ queryKey: ['inboxReportDetail'] })
        }}
      />
      <AccountView
        repo={repo}
        profile={profile}
        onSubmit={async (vals) => {
          await createReport(vals)
          refetch()
        }}
        onShowActionPanel={(subject) => setQuickActionPanelSubject(subject)}
        error={error}
        id={id}
        inboxSection={inboxSection}
      />
    </>
  )
}
