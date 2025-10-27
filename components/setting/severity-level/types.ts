export type SeverityLevelDetail = {
  name: string
  description?: string
  strikeCount?: number
  strikeOnOccurrence?: number
  firstOccurrenceStrikeCount?: number
  needsTakedown?: boolean
  expiryInDays?: number
}

export type SeverityLevelListSetting = Record<string, SeverityLevelDetail>
