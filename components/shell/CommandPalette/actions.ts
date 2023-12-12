import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export const getStaticActions = ({ router }: { router: AppRouterInstance }) => [
  {
    id: 'quick-action-modal',
    name: 'Open Quick Action Panel',
    shortcut: ['q'],
    keywords: 'quick,action,panel',
    perform: () => router.push('/reports?quickOpen=true'),
  },
  {
    id: 'unresolved-reports',
    name: 'Open Unresolved Reports',
    shortcut: ['u'],
    keywords: 'unresolved,reports',
    perform: () => router.push('/reports'),
  },
  {
    id: 'resolved-reports',
    name: 'Open Resolved Reports',
    shortcut: ['r'],
    keywords: 'resolved,reports',
    perform: () => router.push('/reports?reviewState=com.atproto.admin.defs%23reviewClosed'),
  },
  {
    id: 'escalated-reports',
    name: 'Open Escalated Reports',
    shortcut: ['e'],
    keywords: 'escalated,reports',
    perform: () =>
      router.push(
        '/reports?reviewState=com.atproto.admin.defs%23reviewEscalated',
      ),
  },
]
