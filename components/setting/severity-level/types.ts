export type SeverityLevelDetail = {
  name: string
  description?: string
  strikeCount?: number
  strikeOnOccurrence?: number
  firstOccurrenceStrikeCount?: number
  needsTakedown?: boolean
  expiryInDays?: number
  contentEmailSummary?: string
  accountEmailSummary?: string
}

export type SeverityLevelListSetting = Record<string, SeverityLevelDetail>
