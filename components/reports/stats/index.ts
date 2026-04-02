import { groupedReasonTypes } from '../helpers/getType'

export interface StatGroup {
  key: string
  title: string
  description?: string
  reportTypes?: string[]
  queueId?: number
  moderatorDid?: string
}

export function getHrefFromGroup(group: StatGroup): string {
  const params = new URLSearchParams()
  if (group.key) {
    params.set('category', group.key)
  }
  if (group.queueId != null) {
    params.set('queueId', String(group.queueId))
  }
  const qs = params.toString()
  return `/analytics/stats${qs ? `?${qs}` : ''}`
}

export const REPORT_CATEGORIES: StatGroup[] = [
  {
    key: 'violence',
    title: 'Violence & Welfare',
    description: 'Threats, graphic content, self-harm, extremism, trafficking',
    reportTypes: groupedReasonTypes.Violence,
  },
  {
    key: 'sexual',
    title: 'Sexual Content',
    description: 'Abuse content, NCII, sextortion, deepfakes, unlabeled',
    reportTypes: groupedReasonTypes.Sexual,
  },
  {
    key: 'child-safety',
    title: 'Child Safety',
    description: 'CSAM, grooming, minor privacy, endangerment',
    reportTypes: groupedReasonTypes['Child Safety'],
  },
  {
    key: 'harassment',
    title: 'Harassment',
    description: 'Trolling, targeted harassment, hate speech, doxxing',
    reportTypes: groupedReasonTypes.Harassment,
  },
  {
    key: 'misleading',
    title: 'Misleading',
    description: 'Bots, impersonation, spam, scams, misinformation',
    reportTypes: groupedReasonTypes.Misleading,
  },
  {
    key: 'rule-violations',
    title: 'Rule Violations',
    description: 'Site security, stolen content, prohibited sales, ban evasion',
    reportTypes: groupedReasonTypes['Rule Violations'],
  },
  {
    key: 'civic',
    title: 'Civic Issues',
    description:
      'Electoral interference, disclosure, misinformation, impersonation',
    reportTypes: groupedReasonTypes.Civic,
  },
  {
    key: 'appeal',
    title: 'Appeals',
    description: 'User appeals of moderation actions',
    reportTypes: groupedReasonTypes.Appeal,
  },
]
