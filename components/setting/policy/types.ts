export type SeverityLevelConfig = {
  description: string
  isDefault: boolean
  targetServices?: ('appview' | 'pds')[]
}

export type PolicyDetail = {
  name: string
  description: string
  url?: string
  severityLevels?: Record<string, SeverityLevelConfig>
}

export type PolicyListSetting = Record<string, PolicyDetail>
