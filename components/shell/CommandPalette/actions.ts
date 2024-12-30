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
    keywords: 'quick,action,panel',
    perform: () => {
      router.push('/reports?quickOpen=true')
    },
  },
  {
    id: 'workspace-modal',
    name: 'Open Workspace',
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
    keywords: 'unresolved,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewOpen',
      ),
  },
  {
    id: 'resolved-queue',
    name: 'Open Resolved Queue',
    keywords: 'resolved,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewClosed',
      ),
  },
  {
    id: 'escalated-queue',
    name: 'Open Escalated Queue',
    keywords: 'escalated,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewEscalated',
      ),
  },
  {
    id: 'all-queue',
    name: 'Open Moderation Queue',
    keywords: 'all,queue',
    perform: () => router.push('/reports'),
  },
  {
    id: 'appeal-queue',
    name: 'Open Appeal Queue',
    keywords: 'appealed,queue',
    perform: () =>
      router.push(
        '/reports?reviewState=tools.ozone.moderation.defs%23reviewOpen&appealed=true',
      ),
  },
  {
    id: 'filter-macros',
    name: 'Manage Filter Macros',
    keywords: 'filter,macros',
    perform: () => router.push('/events/filters/macros'),
  },
  {
    id: 'view-sets',
    name: 'See All Sets',
    keywords: 'sets,settings',
    perform: () => {
      router.push('/configure?tab=sets')
    },
  },
]
