export interface QueueAssignment {
  id: number
  did: string
  queueId: number
  startAt: string
  endAt: string
}

export interface ReportAssignment {
  id: number
  did: string
  reportId: number
  queueId: number | null
  startAt: string
  endAt: string
}

export type AssignmentsState = {
  queue: {
    subscribed: number[]
    items: QueueAssignment[]
  }
  reports: ReportAssignment[]
}