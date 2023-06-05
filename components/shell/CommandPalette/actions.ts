import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context'

export const getStaticActions = ({ router }: { router: AppRouterInstance }) => [
  {
    id: 'quick-action-modal',
    name: 'Open Quick Action Panel',
    shortcut: ['q'],
    keywords: 'quick,action,panel',
    perform: () => router.push('/reports?quickOpen=true'),
  },
  {
    id: 'resolved-reports',
    name: 'Open Resolved Reports',
    shortcut: ['r'],
    keywords: 'resolved,reports',
    perform: () => router.push('/reports?resolved=true'),
  },
  {
    id: 'escalated-reports',
    name: 'Open Escalated Reports',
    shortcut: ['e'],
    keywords: 'escalated,reports',
    perform: () =>
      router.push(
        '/reports?resolved=&actionType=com.atproto.admin.defs%23escalate',
      ),
  },
]
