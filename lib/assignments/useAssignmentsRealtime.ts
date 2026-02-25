'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuthContext } from '@/shell/AuthContext'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { getServiceUrlFromDoc, withDocAndMeta } from '@/lib/client-config'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MINUTE } from '@/lib/util'
import type { AssignmentView } from './useAssignments'
import { assignmentWs } from './assignment-ws-client'
import type { ServerMessage } from './assignment-ws-client'

const ASSIGNMENTS_QUERY_KEY = 'assignments-ws'

// ── Internal hooks ──

function useWsConnection() {
  const { pdsAgent } = useAuthContext()
  const { config } = useConfigurationContext()

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

  useEffect(() => {
    assignmentWs.configure(getToken, getWsUrl)
  }, [getToken, getWsUrl])

  useEffect(() => {
    assignmentWs.addRef()
    return () => assignmentWs.removeRef()
  }, [])
}

function useWsListener(onMessage: (msg: ServerMessage) => void) {
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useEffect(() => {
    const handler = (msg: ServerMessage) => callbackRef.current(msg)
    assignmentWs.addListener(handler)
    return () => {
      assignmentWs.removeListener(handler)
    }
  }, [])
}

// ── Public hooks ──

/** Call this hook to open/maintain the WS connection. Use in page components. */
export const useAssignmentsUpgrade = () => {
  useWsConnection()
}

export const useQueueAssignments = (params: {
  onlyActiveAssignments?: boolean
  queueIds?: number[]
  dids?: string[]
}) => {
  const queryClient = useQueryClient()

  const queueIds = params.queueIds ?? []

  useEffect(() => {
    if (queueIds.length > 0) {
      assignmentWs.subscribe(queueIds)
    }
  }, [JSON.stringify(queueIds)])

  useWsListener(
    useCallback(
      (msg: ServerMessage) => {
        if (msg.type === 'queue:snapshot') {
          let filtered = msg.events
          if (queueIds.length > 0) {
            filtered = filtered.filter(
              (a) => a.queueId != null && queueIds.includes(a.queueId),
            )
          }
          if (params.dids?.length) {
            filtered = filtered.filter((a) => params.dids!.includes(a.did))
          }
          queryClient.setQueryData(
            [ASSIGNMENTS_QUERY_KEY, params],
            filtered,
          )
        } else if (
          msg.type === 'queue:assigned' ||
          msg.type === 'report:review:started' ||
          msg.type === 'report:review:ended' ||
          msg.type === 'report:actioned'
        ) {
          if (queueIds.length > 0) {
            assignmentWs.send({ type: 'subscribe', queues: queueIds })
          }
        }
      },
      [JSON.stringify(params)],
    ),
  )

  return useQuery<AssignmentView[]>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: () =>
      queryClient.getQueryData<AssignmentView[]>([
        ASSIGNMENTS_QUERY_KEY,
        params,
      ]) ?? [],
    refetchInterval: false,
    enabled: false,
  })
}

export const useReportAssignments = (params: {
  reportIds?: number[]
  onlyActiveAssignments?: boolean
  dids?: string[]
}) => {
  const queryClient = useQueryClient()

  useWsListener(
    useCallback(
      (msg: ServerMessage) => {
        if (msg.type === 'report:snapshot') {
          let filtered = msg.events
          if (params.reportIds?.length) {
            filtered = filtered.filter(
              (a) =>
                a.reportId != null && params.reportIds!.includes(a.reportId),
            )
          }
          if (params.dids?.length) {
            filtered = filtered.filter((a) => params.dids!.includes(a.did))
          }
          queryClient.setQueryData(
            [ASSIGNMENTS_QUERY_KEY, params],
            filtered,
          )
        } else if (
          msg.type === 'report:review:started' ||
          msg.type === 'report:review:ended' ||
          msg.type === 'report:actioned'
        ) {
          const relevant =
            msg.type === 'report:actioned'
              ? params.reportIds?.length
                ? msg.reportIds.some((id) => params.reportIds!.includes(id))
                : true
              : params.reportIds?.length
                ? params.reportIds.includes(msg.reportId)
                : true
          if (relevant) {
            assignmentWs.resubscribe()
          }
        }
      },
      [JSON.stringify(params)],
    ),
  )

  return useQuery<AssignmentView[]>({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: () =>
      queryClient.getQueryData<AssignmentView[]>([
        ASSIGNMENTS_QUERY_KEY,
        params,
      ]) ?? [],
    refetchInterval: false,
    enabled: false,
  })
}

export const useAssignReport = () => {
  const queryClient = useQueryClient()
  return {
    mutate: (input: {
      reportId: number
      queueId?: number
      assign: boolean
    }) => {
      assignmentWs.send({
        type: input.assign ? 'report:review:start' : 'report:review:end',
        reportId: input.reportId,
        queueId: input.queueId,
      })
      queryClient.invalidateQueries([ASSIGNMENTS_QUERY_KEY])
    },
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
  const assign = useCallback(() => {
    assignmentWs.send({ type: 'report:review:start', reportId, queueId })
  }, [reportId, queueId])

  const unassign = useCallback(() => {
    assignmentWs.send({ type: 'report:review:end', reportId, queueId })
  }, [reportId, queueId])

  useEffect(() => {
    assign()
    const interval = setInterval(assign, AUTO_ASSIGN_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      unassign()
    }
  }, [reportId, queueId, assign, unassign])
}
