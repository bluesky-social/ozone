export type PriorityLevel = {
  name: string
  description?: string
  targetResolutionMinutes: number
  score: number
}

export type PriorityLevels = Record<string, PriorityLevel>
export type ReportPriorityLevels = Record<string, string>
