import { TakedownTargetService } from '@/lib/types'

export type SeverityLevelConfig = {
  description: string
  isDefault: boolean
  targetServices?: TakedownTargetService[]
}

export type PolicyDetail = {
  name: string
  description: string
  url?: string
  emailSummary?: string
  emailBullets?: string
  emailExtraNotes?: string
  severityLevels?: Record<string, SeverityLevelConfig>
}

export type PolicyListSetting = Record<string, PolicyDetail>
