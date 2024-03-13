import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export const getStaticActions = ({ router }: { router: AppRouterInstance }) => [
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
    id: 'unresolved-queue',
    name: 'Open Unresolved Queue',
    shortcut: ['u'],
    keywords: 'unresolved,queue',
    perform: () =>
      router.push('/reports?reviewState=tools.ozone.moderation.defs%23reviewOpen'),
  },
  {
    id: 'resolved-queue',
    name: 'Open Resolved Queue',
    shortcut: ['r'],
    keywords: 'resolved,queue',
    perform: () => router.push('/reports?reviewState=tools.ozone.moderation.defs%23reviewClosed'),
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
]
