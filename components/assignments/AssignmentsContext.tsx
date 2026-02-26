'use client'

import { AssignmentsState } from '@/lib/assignments/assignment.types'
import { AssignmentWsClient } from '@/lib/assignments/ws/assignment-ws-client'
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

  // state
  const [state, setState] = useState<AssignmentsState>({
    queue: {
      subscribed: [],
      items: [],
    },
    reports: [],
  })

  const assignmentWs = useMemo(() => {
    const client = new AssignmentWsClient()
    client.addListener((newState) => {
      setState(newState)
    })
    return client
  }, [])

  // auth
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

  // lifecycle
  useEffect(() => {
    assignmentWs.configure(getToken, getWsUrl)
    assignmentWs.connect()
    return () => {
      assignmentWs.disconnect()
    }
  }, [assignmentWs, getToken, getWsUrl])

  // interface
  const subscribe = useCallback(
    (queueIds: number[]) => {
      assignmentWs.subscribe(queueIds)
    },
    [assignmentWs],
  )
  const unsubscribe = useCallback(
    (queueIds: number[]) => {
      assignmentWs.unsubscribe(queueIds)
    },
    [assignmentWs],
  )
  const assignReportModerator = useCallback(
    (reportId: number, queueId?: number) => {
      assignmentWs.assignReportModerator(reportId, queueId)
    },
    [assignmentWs],
  )
  const unassignReportModerator = useCallback(
    (reportId: number, queueId?: number) => {
      assignmentWs.unassignReportModerator(reportId, queueId)
    },
    [assignmentWs],
  )

  const value: AssignmentsContextValue = useMemo(
    () => ({
      state,
      subscribe,
      unsubscribe,
      assignReportModerator,
      unassignReportModerator,
    }),
    [state, subscribe, unsubscribe, assignReportModerator, unassignReportModerator],
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

  useEffect(() => {
    if (queueIds.length > 0) {
      subscribe(queueIds)
    }
    return () => {
      if (queueIds.length > 0) {
        unsubscribe(queueIds)
      }
    }
  }, [JSON.stringify(queueIds), subscribe, unsubscribe])

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
  }, [state.reports, JSON.stringify(params)])

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
