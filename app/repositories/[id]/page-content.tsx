'use client'
import { AccountView } from '@/repositories/AccountView'
import { createReport } from '@/repositories/createReport'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { ComAtprotoAdminEmitModerationEvent } from '@atproto/api'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { emitEvent } from '@/mod-event/helpers/emitEvent'

export function RepositoryViewPageContent({ id }: { id: string }) {
  const {
    error,
    data: { repo, profile } = {},
    refetch,
    isLoading: isInitialLoading,
  } = useRepoAndProfile({ id })
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

  return (
    <>
      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam} // select first subject if there are multiple
        subjectOptions={[quickOpenParam]}
        isInitialLoading={isInitialLoading}
        onSubmit={async (
          vals: ComAtprotoAdminEmitModerationEvent.InputSchema,
        ) => {
          await emitEvent(vals)
          refetch()
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
      />
    </>
  )
}
