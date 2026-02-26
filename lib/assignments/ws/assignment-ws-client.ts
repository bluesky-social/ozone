import type { QueueAssignment, ReportAssignment } from '../assignment.types'

export type ServerMessage =
  | { type: 'queue:snapshot'; events: QueueAssignment[] }
  | { type: 'report:snapshot'; events: ReportAssignment[] }
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
  | { type: 'queue:assigned'; queueId: number; did: string }
  | { type: 'pong' }
  | { type: 'error'; message: string }

type ClientMessage =
  | { type: 'subscribe'; queues: number[] }
  | { type: 'unsubscribe'; queues: number[] }
  | { type: 'report:review:start'; reportId: number; queueId?: number }
  | { type: 'report:review:end'; reportId: number; queueId?: number }
  | { type: 'ping' }

export type MessageListener = (message: ServerMessage) => void

const PING_INTERVAL = 25_000
const RECONNECT_DELAY = 3_000

export class AssignmentWsClient {
  // connection
  private ws: WebSocket | null = null
  private pendingMessages: ClientMessage[] = []
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  // config
  private getToken: (() => Promise<string>) | null = null
  private getWsUrl: ((token: string) => string | null) | null = null

  // listeners
  private listeners: MessageListener[] = []

  // subscriptions (for re-subscribing on reconnect)
  private subscribedQueues: number[] = []

  // config
  configure(
    getToken: () => Promise<string>,
    getWsUrl: (token: string) => string | null,
  ) {
    this.getToken = getToken
    this.getWsUrl = getWsUrl
  }

  // lifecycle
  async connect() {
    if (this.ws) return
    if (!this.getToken || !this.getWsUrl) return
    try {
      const token = await this.getToken()
      const wsUrl = this.getWsUrl(token)
      if (!wsUrl) return
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => this.onOpen(ws)
      ws.onmessage = this.onMessage
      ws.onclose = this.onClose
      ws.onerror = this.onError
    } catch (err) {
      console.error('Failed to connect assignment WS:', err)
      this.onError()
    }
  }

  disconnect() {
    this.clearPing()
    this.clearReconnect()
    this.setReconnect()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  destroy() {
    this.clearPing()
    this.clearReconnect()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.pendingMessages = []
    this.subscribedQueues = []
  }

  // events
  private onOpen(ws: WebSocket) {
    this.ws = ws
    for (const pending of this.pendingMessages) {
      this.send(pending)
    }
    this.pendingMessages = []
    if (this.subscribedQueues.length > 0) {
      this.send({ type: 'subscribe', queues: Array.from(this.subscribedQueues) })
    }
    this.clearPing()
    this.setPing()
  }

  private onMessage = (event: MessageEvent) => {
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

  private onClose = () => {
    this.ws = null
    this.clearPing()
    this.clearReconnect()
    this.setReconnect()
  }

  private onError = () => {
    this.clearPing()
    this.clearReconnect()
    this.setReconnect()
    this.ws?.close()
    this.ws = null
  }

  // intervals
  private setPing() {
    if (this.pingInterval) return
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, PING_INTERVAL)
  }

  private clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private setReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, RECONNECT_DELAY)
  }

  private clearReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  // listeners
  addListener(fn: MessageListener) {
    this.listeners.push(fn)
  }

  removeListener(fn: MessageListener) {
    this.listeners = this.listeners.filter((f) => f !== fn)
  }

  // messaging
  private send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.pendingMessages.push(message)
    }
  }

  subscribe(queueIds: number[]) {
    this.subscribedQueues = Array.from(
      new Set([...this.subscribedQueues, ...queueIds]),
    )
    this.send({ type: 'subscribe', queues: queueIds })
  }

  unsubscribe(queueIds: number[]) {
    this.subscribedQueues = this.subscribedQueues.filter(
      (id) => !queueIds.includes(id),
    )
    this.send({ type: 'unsubscribe', queues: queueIds })
  }

  assignReportModerator(reportId: number, queueId?: number) {
    this.send({ type: 'report:review:start', reportId, queueId })
  }

  unassignReportModerator(reportId: number, queueId?: number) {
    this.send({ type: 'report:review:end', reportId, queueId })
  }
}
