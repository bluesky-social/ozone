'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuthContext } from '@/shell/AuthContext'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { getServiceUrlFromDoc, withDocAndMeta } from '@/lib/client-config'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { displayError } from '@/common/Loader'
import { toast } from 'react-toastify'
import { MINUTE } from '@/lib/util'
import type { AssignmentView } from './useAssignments'

// ── Protocol types (matching backend assignment-ws.ts) ──

type ServerMessage =
  | { type: 'queue:snapshot'; events: AssignmentView[] }
  | { type: 'report:snapshot'; events: AssignmentView[] }
  | {
      type: 'report:review:started'
      reportId: number
      moderator: { did: string }
      queues: number[]
    }
  | {
      type: 'report:review:ended'
      reportId: number
      moderator: { did: string }
      queues: number[]
    }
  | {
      type: 'report:actioned'
      reportIds: number[]
      actionEventId: number
      moderator: { did: string }
      queues: number[]
    }
  | { type: 'report:created'; reportId: number; queues: number[] }
  | { type: 'queue:assigned'; queueId: number }
  | { type: 'pong' }
  | { type: 'error'; message: string }

type ClientMessage =
  | { type: 'subscribe'; queues: number[] }
  | { type: 'unsubscribe'; queues: number[] }
  | { type: 'report:review:start'; reportId: number; queueId?: number }
  | { type: 'report:review:end'; reportId: number; queueId?: number }
  | { type: 'ping' }

// ── Shared WebSocket connection manager (singleton) ──

const PING_INTERVAL = 30_000
const RECONNECT_DELAY = 3_000
const ASSIGNMENTS_QUERY_KEY = 'assignments-ws'

let wsInstance: WebSocket | null = null
const listeners = new Set<(msg: ServerMessage) => void>()
let pingInterval: ReturnType<typeof setInterval> | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let refCount = 0
let subscribedQueues = new Set<number>()
let getTokenFn: (() => Promise<string>) | null = null
let getWsUrlFn: ((token: string) => string | null) | null = null

function clearPing() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

function send(message: ClientMessage) {
  if (wsInstance?.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify(message))
  }
}

function resubscribe() {
  if (subscribedQueues.size > 0) {
    send({ type: 'subscribe', queues: Array.from(subscribedQueues) })
  }
}

async function connect() {
  if (!getTokenFn || !getWsUrlFn) return
  try {
    const token = await getTokenFn()
    const wsUrl = getWsUrlFn(token)
    if (!wsUrl) return

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      wsInstance = ws
      resubscribe()
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, PING_INTERVAL)
    }

    ws.onmessage = (event: MessageEvent) => {
      let message: ServerMessage
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      for (const listener of listeners) {
        listener(message)
      }
    }

    ws.onclose = () => {
      wsInstance = null
      clearPing()
      if (refCount > 0) {
        reconnectTimeout = setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  } catch (err) {
    console.error('Failed to connect assignment WS:', err)
    if (refCount > 0) {
      reconnectTimeout = setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  }
}

function disconnect() {
  clearPing()
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (wsInstance) {
    wsInstance.onclose = null
    wsInstance.close()
    wsInstance = null
  }
}

function addRef() {
  refCount++
  if (refCount === 1) {
    connect()
  }
}

function removeRef() {
  refCount--
  if (refCount <= 0) {
    refCount = 0
    disconnect()
    subscribedQueues.clear()
  }
}

// ── Internal hooks ──

function useWsConnection() {
  const { pdsAgent } = useAuthContext()
  const { config } = useConfigurationContext()

  getTokenFn = useCallback(async (): Promise<string> => {
    const { data } = await pdsAgent.com.atproto.server.getServiceAuth({
      aud: config.did,
    })
    return data.token
  }, [pdsAgent, config.did])

  getWsUrlFn = useCallback(
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
    addRef()
    return () => removeRef()
  }, [])
}

function useWsListener(onMessage: (msg: ServerMessage) => void) {
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useEffect(() => {
    const handler = (msg: ServerMessage) => callbackRef.current(msg)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])
}

function subscribeQueues(queueIds: number[]) {
  const newQueues = queueIds.filter((id) => !subscribedQueues.has(id))
  for (const id of queueIds) subscribedQueues.add(id)
  if (newQueues.length > 0) {
    send({ type: 'subscribe', queues: Array.from(subscribedQueues) })
  }
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
      subscribeQueues(queueIds)
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
            send({ type: 'subscribe', queues: queueIds })
          }
        }
      },
      [JSON.stringify(params)],
    ),
  )

  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } =
        await labelerAgent.tools.ozone.queue.getAssignments(params)
      return (data as { assignments: AssignmentView[] }).assignments
    },
    refetchInterval: false,
    onError: (err) => {
      toast.error(`Failed to load assignments:\n${err}`)
    },
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
            resubscribe()
          }
        }
      },
      [JSON.stringify(params)],
    ),
  )

  const labelerAgent = useLabelerAgent()
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } =
        await labelerAgent.tools.ozone.report.getAssignments(params)
      return (data as { assignments: AssignmentView[] }).assignments
    },
    refetchInterval: false,
    onError: (err) => {
      toast.error(`Failed to load assignments:\n${err}`)
    },
  })
}

export const useAssignQueue = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: { did: string; queueId: number; assign: boolean }) => {
      const { data } =
        await labelerAgent.tools.ozone.queue.assignModerator(input)
      return data as AssignmentView
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([ASSIGNMENTS_QUERY_KEY])
      },
      onError: (err) => {
        toast.error(displayError(err))
      },
    },
  )
}

export const useAssignReport = () => {
  const labelerAgent = useLabelerAgent()
  const queryClient = useQueryClient()
  return useMutation(
    async (input: { reportId: number; queueId?: number; assign: boolean }) => {
      const { data } =
        await labelerAgent.tools.ozone.report.assignModerator(input)
      return data as AssignmentView
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([ASSIGNMENTS_QUERY_KEY])
      },
      onError: (err) => {
        toast.error(displayError(err))
      },
    },
  )
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
    send({ type: 'report:review:start', reportId, queueId })
  }, [reportId, queueId])

  const unassign = useCallback(() => {
    send({ type: 'report:review:end', reportId, queueId })
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
