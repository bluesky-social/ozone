'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthContext } from '@/shell/AuthContext'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { getServiceUrlFromDoc, withDocAndMeta } from '@/lib/client-config'

export interface AssignmentEvent {
  id: number
  did: string
  queueId: number | null
  reportId: number | null
  startAt: string
  endAt: string
}

export type ServerMessage =
  | { type: 'snapshot'; events: AssignmentEvent[] }
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

const PING_INTERVAL = 30_000
const RECONNECT_DELAY = 3_000

export function useAssignmentsRealtime(queueIds: number[]) {
  const { pdsAgent } = useAuthContext()
  const { config } = useConfigurationContext()
  const [assignments, setAssignments] = useState<AssignmentEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queueIdsRef = useRef(queueIds)
  queueIdsRef.current = queueIds

  const getWsUrl = useCallback(
    (token: string) => {
      const fullConfig = withDocAndMeta(config)
      const serviceUrl = getServiceUrlFromDoc(
        fullConfig.doc,
        'atproto_labeler',
      )
      if (!serviceUrl) return null
      const url = new URL('/ws/assignments', serviceUrl)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      // Browser WebSocket API doesn't support custom headers,
      // so we pass the token as a query parameter.
      // The server's authenticateRequest must also check url query params.
      url.searchParams.set('token', token)
      return url.toString()
    },
    [config],
  )

  const getAuthToken = useCallback(async (): Promise<string> => {
    const { data } = await pdsAgent.com.atproto.server.getServiceAuth({
      aud: config.did,
    })
    return data.token
  }, [pdsAgent, config.did])

  const handleMessage = useCallback((event: MessageEvent) => {
    let message: ServerMessage
    try {
      message = JSON.parse(event.data)
    } catch {
      return
    }

    switch (message.type) {
      case 'snapshot':
        setAssignments(message.events)
        break
      case 'report:review:started': {
        const fiveMin = new Date(Date.now() + 5 * 60 * 1000).toISOString()
        setAssignments((prev) => {
          const existing = prev.find(
            (a) => a.reportId === message.reportId,
          )
          if (existing) {
            return prev.map((a) =>
              a.reportId === message.reportId
                ? { ...a, did: message.moderator.did, endAt: fiveMin }
                : a,
            )
          }
          return [
            ...prev,
            {
              id: Date.now(),
              did: message.moderator.did,
              queueId: message.queues[0] ?? null,
              reportId: message.reportId,
              startAt: new Date().toISOString(),
              endAt: fiveMin,
            },
          ]
        })
        break
      }
      case 'report:review:ended':
        setAssignments((prev) =>
          prev.filter((a) => a.reportId !== message.reportId),
        )
        break
      case 'queue:assigned':
        // Queue assignment changed — no full assignment data in message,
        // so re-subscribe to get a fresh snapshot
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'subscribe',
              queues: queueIdsRef.current,
            }),
          )
        }
        break
      case 'report:actioned':
        setAssignments((prev) =>
          prev.filter((a) => !message.reportIds.includes(a.reportId!)),
        )
        break
      case 'pong':
      case 'error':
        if (message.type === 'error') {
          console.error('Assignment WS error:', message.message)
        }
        break
    }
  }, [])

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const clearPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  const connect = useCallback(async () => {
    try {
      const token = await getAuthToken()
      const wsUrl = getWsUrl(token)
      if (!wsUrl) return

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setIsConnected(true)
        wsRef.current = ws

        if (queueIdsRef.current.length > 0) {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              queues: queueIdsRef.current,
            }),
          )
        }

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, PING_INTERVAL)
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
        clearPing()

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (err) {
      console.error('Failed to connect assignment WS:', err)
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  }, [getWsUrl, getAuthToken, handleMessage, clearPing])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => {
      clearPing()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null // Prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
      setIsConnected(false)
    }
  }, [connect, clearPing])

  // Resubscribe when queueIds change
  useEffect(() => {
    if (!isConnected) return
    send({ type: 'subscribe', queues: queueIds })
  }, [isConnected, queueIds, send])

  const startReportReview = useCallback(
    (reportId: number, queueId?: number) => {
      send({ type: 'report:review:start', reportId, queueId })
    },
    [send],
  )

  const endReportReview = useCallback(
    (reportId: number, queueId?: number) => {
      send({ type: 'report:review:end', reportId, queueId })
    },
    [send],
  )

  return {
    assignments,
    isConnected,
    startReportReview,
    endReportReview,
    send,
  }
}
