import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { ReadonlyURLSearchParams } from 'next/navigation'

export const getStaticActions = ({
  router,
  pathname,
  searchParams,
}: {
  router: AppRouterInstance
  pathname: string
  searchParams: ReadonlyURLSearchParams
}) => [
  {
    id: 'quick-action-modal',
    name: 'Open Quick Action Panel',
    shortcut: ['q'],
    keywords: 'quick,action,panel',
    perform: () => {
      router.push('/reports?quickOpen=true')
    },
  },
  {
    id: 'workspace-modal',
    name: 'Open Workspace',
    shortcut: ['w'],
    keywords: 'workspace,panel',
    perform: () => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('workspaceOpen', 'true')
      router.push((pathname ?? '') + '?' + newParams.toString())
    },
  },
  {
    id: 'unresolved-queue',
    name: 'Open Unresolved Queue',
    shortcut: ['u'],
    keywords: 'unresolved,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewOpen',
      ),
  },
  {
    id: 'resolved-queue',
    name: 'Open Resolved Queue',
    shortcut: ['r'],
    keywords: 'resolved,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewClosed',
      ),
  },
  {
    id: 'escalated-queue',
    name: 'Open Escalated Queue',
    shortcut: ['e'],
    keywords: 'escalated,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewEscalated',
      ),
  },
  {
    id: 'all-queue',
    name: 'Open Moderation Queue',
    shortcut: ['a'],
    keywords: 'all,queue',
    perform: () => router.push('/reports'),
  },
  {
    id: 'appeal-queue',
    name: 'Open Appeal Queue',
    shortcut: ['e'],
    keywords: 'appealed,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewOpen&appealed=true',
      ),
  },
  {
    id: 'filter-macros',
    name: 'Manage Filter Macros',
    shortcut: ['f'],
    keywords: 'filter,macros',
    perform: () => router.push('/events/filters/macros'),
  },
]
