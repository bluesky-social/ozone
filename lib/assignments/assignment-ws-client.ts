import type { AssignmentView } from './useAssignments'

// ── Protocol types (matching backend assignment-ws.ts) ──

export type ServerMessage =
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

export type ClientMessage =
  | { type: 'subscribe'; queues: number[] }
  | { type: 'unsubscribe'; queues: number[] }
  | { type: 'report:review:start'; reportId: number; queueId?: number }
  | { type: 'report:review:end'; reportId: number; queueId?: number }
  | { type: 'ping' }

const PING_INTERVAL = 25_000
const RECONNECT_DELAY = 3_000

export class AssignmentWsClient {
  private ws: WebSocket | null = null
  private connecting = false
  private listeners = new Set<(msg: ServerMessage) => void>()
  private pendingMessages: ClientMessage[] = []
  private subscribedQueues = new Set<number>()
  private refCount = 0
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private getToken: (() => Promise<string>) | null = null
  private getWsUrl: ((token: string) => string | null) | null = null

  configure(
    getToken: () => Promise<string>,
    getWsUrl: (token: string) => string | null,
  ) {
    this.getToken = getToken
    this.getWsUrl = getWsUrl
  }

  addRef() {
    this.refCount++
    if (this.refCount === 1) {
      this.connect()
    }
  }

  removeRef() {
    this.refCount--
    if (this.refCount <= 0) {
      this.refCount = 0
      this.disconnect()
      this.subscribedQueues.clear()
      this.pendingMessages = []
    }
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.pendingMessages.push(message)
    }
  }

  addListener(fn: (msg: ServerMessage) => void) {
    this.listeners.add(fn)
  }

  removeListener(fn: (msg: ServerMessage) => void) {
    this.listeners.delete(fn)
  }

  subscribe(queueIds: number[]) {
    const newQueues = queueIds.filter((id) => !this.subscribedQueues.has(id))
    for (const id of queueIds) this.subscribedQueues.add(id)
    if (newQueues.length > 0) {
      this.send({
        type: 'subscribe',
        queues: Array.from(this.subscribedQueues),
      })
    }
  }

  resubscribe() {
    if (this.subscribedQueues.size > 0) {
      this.send({
        type: 'subscribe',
        queues: Array.from(this.subscribedQueues),
      })
    }
  }

  private async connect() {
    if (this.connecting || this.ws) return
    if (!this.getToken || !this.getWsUrl) return
    this.connecting = true
    try {
      const token = await this.getToken()
      const wsUrl = this.getWsUrl(token)
      if (!wsUrl) {
        this.connecting = false
        return
      }

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        this.connecting = false
        this.ws = ws

        // Re-subscribe to queues on (re)connect
        if (this.subscribedQueues.size > 0) {
          const msg: ClientMessage = {
            type: 'subscribe',
            queues: Array.from(this.subscribedQueues),
          }
          ws.send(JSON.stringify(msg))
        }

        // Flush any messages queued before the connection was open
        for (const pending of this.pendingMessages) {
          ws.send(JSON.stringify(pending))
        }
        this.pendingMessages = []

        this.pingInterval = setInterval(() => {
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
        for (const listener of this.listeners) {
          listener(message)
        }
      }

      ws.onclose = () => {
        this.ws = null
        this.connecting = false
        this.clearPing()
        if (this.refCount > 0) {
          this.reconnectTimeout = setTimeout(() => {
            this.connect()
          }, RECONNECT_DELAY)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch (err) {
      this.connecting = false
      console.error('Failed to connect assignment WS:', err)
      if (this.refCount > 0) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect()
        }, RECONNECT_DELAY)
      }
    }
  }

  private disconnect() {
    this.connecting = false
    this.clearPing()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  private clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}

export const assignmentWs = new AssignmentWsClient()
