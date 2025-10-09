export type PolicyDetail = {
  name: string
  description: string
  url?: string
  severityLevels?: string[]
}

export type PolicyListSetting = Record<string, PolicyDetail>
