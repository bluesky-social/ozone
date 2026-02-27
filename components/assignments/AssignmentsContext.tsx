'use client'

import { AssignmentsState } from '@/lib/assignments/assignment.types'
import {
  AssignmentWsClient,
  ServerMessage,
} from '@/lib/assignments/ws/assignment-ws-client'
import { getServiceUrlFromDoc, withDocAndMeta } from '@/lib/client-config'
import { MINUTE } from '@/lib/util'
import { useAuthContext } from '@/shell/AuthContext'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export interface AssignmentsContextValue {
  state: AssignmentsState
  subscribe: (queueIds: number[]) => void
  unsubscribe: (queueIds: number[]) => void
  assignReportModerator: (reportId: number, queueId?: number) => void
  unassignReportModerator: (reportId: number, queueId?: number) => void
}

const AssignmentsContext = createContext<AssignmentsContextValue | null>(null)

export function AssignmentsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { pdsAgent } = useAuthContext()
  const { config } = useConfigurationContext()

  // ws client
  const getToken = useCallback(async (): Promise<string> => {
    const { data } = await pdsAgent.com.atproto.server.getServiceAuth({
      aud: config.did,
    })
    return data.token
  }, [pdsAgent, config.did])
  const getWsUrl = useCallback(
    (token: string) => {
      const fullConfig = withDocAndMeta(config)
      const serviceUrl = getServiceUrlFromDoc(fullConfig.doc, 'atproto_labeler')
      if (!serviceUrl) return null
      const url = new URL('/ws/assignments', serviceUrl)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.searchParams.set('token', token)
      return url.toString()
    },
    [config],
  )
  const wsRef = useRef<AssignmentWsClient | null>(null)
  if (!wsRef.current) {
    wsRef.current = new AssignmentWsClient()
  }
  const ws = wsRef.current
  useEffect(() => {
    ws.configure(getToken, getWsUrl)
    ws.connect()
    return () => ws.disconnect()
  }, [ws, getToken, getWsUrl])

  // state
  const [state, setState] = useState<AssignmentsState>({
    queue: { subscribed: [], items: [] },
    reports: [],
  })
  useEffect(() => {
    const listener = (message: ServerMessage) => {
      switch (message.type) {
        case 'queue:snapshot':
          setState((s) => ({
            ...s,
            queue: { ...s.queue, items: message.events },
          }))
          break
        case 'report:snapshot':
          setState((s) => ({ ...s, reports: message.events }))
          break
        case 'queue:assigned':
          setState((s) => {
            const exists = s.queue.items.some(
              (a) => a.queueId === message.queueId && a.did === message.did,
            )
            if (exists) return s
            return {
              ...s,
              queue: {
                ...s.queue,
                items: [
                  ...s.queue.items,
                  {
                    id: 0,
                    queueId: message.queueId,
                    did: message.did,
                    startAt: new Date().toISOString(),
                    endAt: '',
                  },
                ],
              },
            }
          })
          break
        case 'report:review:started':
          setState((s) => {
            const exists = s.reports.some(
              (a) =>
                a.reportId === message.reportId &&
                a.did === message.moderator.did,
            )
            if (exists) return s
            return {
              ...s,
              reports: [
                ...s.reports,
                {
                  id: 0,
                  reportId: message.reportId,
                  did: message.moderator.did,
                  queueId: message.queues[0] ?? null,
                  startAt: new Date().toISOString(),
                  endAt: '',
                },
              ],
            }
          })
          break
        case 'report:review:ended':
          setState((s) => {
            const filtered = s.reports.filter(
              (a) =>
                !(
                  a.reportId === message.reportId &&
                  a.did === message.moderator.did
                ),
            )
            if (filtered.length === s.reports.length) return s
            return { ...s, reports: filtered }
          })
          break
      }
    }
    ws.addListener(listener)
    return () => ws.removeListener(listener)
  }, [ws])

  // interface
  const subscribe = useCallback(
    (queueIds: number[]) => {
      setState((s) => ({
        ...s,
        queue: { ...s.queue, subscribed: queueIds },
      }))
      ws.subscribe(queueIds)
    },
    [ws],
  )
  const unsubscribe = useCallback(
    (queueIds: number[]) => {
      setState((s) => ({
        ...s,
        queue: {
          ...s.queue,
          subscribed: s.queue.subscribed.filter((id) => !queueIds.includes(id)),
        },
      }))
      ws.unsubscribe(queueIds)
    },
    [ws],
  )
  const assignReportModerator = useCallback(
    (reportId: number, queueId?: number) =>
      ws.assignReportModerator(reportId, queueId),
    [ws],
  )
  const unassignReportModerator = useCallback(
    (reportId: number, queueId?: number) =>
      ws.unassignReportModerator(reportId, queueId),
    [ws],
  )

  const value: AssignmentsContextValue = useMemo(
    () => ({
      state,
      subscribe,
      unsubscribe,
      assignReportModerator,
      unassignReportModerator,
    }),
    [
      state,
      subscribe,
      unsubscribe,
      assignReportModerator,
      unassignReportModerator,
    ],
  )

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  )
}

export function useAssignmentsContext() {
  const ctx = useContext(AssignmentsContext)
  if (!ctx) {
    throw new Error(
      'useAssignmentsContext must be used within an AssignmentsProvider',
    )
  }
  return ctx
}

export function useQueueAssignments(queueIds: number[]) {
  const { state, subscribe, unsubscribe } = useAssignmentsContext()
  const serialized = JSON.stringify(queueIds)

  useEffect(() => {
    const ids: number[] = JSON.parse(serialized)
    subscribe(ids)
    return () => unsubscribe(ids)
  }, [serialized, subscribe, unsubscribe])

  return state.queue.items
}

export const useReportAssignments = (params: {
  reportIds?: number[]
  queueIds?: number[]
  onlyActiveAssignments?: boolean
  dids?: string[]
}) => {
  const { state, subscribe, unsubscribe } = useAssignmentsContext()
  const queueIds = params.queueIds ?? []
  const serializedQueueIds = JSON.stringify(queueIds)

  useEffect(() => {
    const ids: number[] = JSON.parse(serializedQueueIds)
    if (ids.length > 0) {
      subscribe(ids)
    }
    return () => {
      if (ids.length > 0) {
        unsubscribe(ids)
      }
    }
  }, [serializedQueueIds, subscribe, unsubscribe])

  const serializedParams = JSON.stringify(params)
  const data = useMemo(() => {
    let filtered = state.reports
    if (params.reportIds?.length) {
      filtered = filtered.filter(
        (a) => a.reportId != null && params.reportIds!.includes(a.reportId),
      )
    }
    if (params.dids?.length) {
      filtered = filtered.filter((a) => params.dids!.includes(a.did))
    }
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reports, serializedParams])

  return { data }
}

export const useAssignReport = () => {
  const { assignReportModerator, unassignReportModerator } =
    useAssignmentsContext()

  return {
    assignReportModerator,
    unassignReportModerator,
  }
}

const AUTO_ASSIGN_INTERVAL_MS = 3 * MINUTE
export const useAutoAssignReport = ({
  reportId,
  queueId,
}: {
  reportId: number
  queueId?: number
}) => {
  const { assignReportModerator, unassignReportModerator } =
    useAssignmentsContext()

  const assign = useCallback(() => {
    assignReportModerator(reportId, queueId)
  }, [reportId, queueId, assignReportModerator])

  const unassign = useCallback(() => {
    unassignReportModerator(reportId, queueId)
  }, [reportId, queueId, unassignReportModerator])

  useEffect(() => {
    assign()
    const interval = setInterval(assign, AUTO_ASSIGN_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      unassign()
    }
  }, [reportId, queueId, assign, unassign])
}
