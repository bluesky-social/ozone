'use client'
import { AccountView } from '@/repositories/AccountView'
import { createReport } from '@/repositories/createReport'
import { useRepoAndProfile } from '@/repositories/useRepoAndProfile'
import { ComAtprotoAdminEmitModerationEvent } from '@atproto/api'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { emitEvent } from '@/mod-event/helpers/emitEvent'
import { useEffect } from 'react'

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
  const tab = searchParams.get('tab')

  // Change title dynamically
  // Once we retrieve the profile/repo details, show the handle
  // Show the current tab name from account view
  useEffect(() => {
    let title = `Repository Details`
    const titleFragments: string[] = [title]
    const titleFromTab = tab ? tab[0].toUpperCase() + tab.slice(1) : ''

    if (titleFromTab) {
      titleFragments.unshift(titleFromTab)
    }

    if (profile) {
      titleFragments.unshift(profile.handle)
    } else if (repo) {
      titleFragments.unshift(repo.handle)
    } else {
      titleFragments.unshift(id)
    }

    document.title = titleFragments.join(' - ')
  }, [id, repo, profile, tab])

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
