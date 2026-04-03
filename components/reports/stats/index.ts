import { groupedReasonTypes } from '../helpers/getType'

export interface StatGroup {
  title: string
  description?: string
  category?: keyof typeof groupedReasonTypes
  queueId?: number
  moderatorDid?: string
}

export const STATS_COLORS = {
  Inbound: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Escalated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Actioned:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

export function getHrefFromGroup(group: StatGroup): string {
  const params = new URLSearchParams()
  if (group.category) {
    params.set('category', group.category)
  }
  if (group.queueId != null) {
    params.set('queueId', String(group.queueId))
  }
  const qs = params.toString()
  return `/analytics/detail${qs ? `?${qs}` : ''}`
}

export const REPORT_CATEGORIES: StatGroup[] = [
  {
    title: 'Violence & Welfare',
    description: 'Threats, graphic content, self-harm, extremism, trafficking',
    category: 'Violence',
  },
  {
    title: 'Sexual Content',
    description: 'Abuse content, NCII, sextortion, deepfakes, unlabeled',
    category: 'Sexual',
  },
  {
    title: 'Child Safety',
    description: 'CSAM, grooming, minor privacy, endangerment',
    category: 'Child Safety',
  },
  {
    title: 'Harassment',
    description: 'Trolling, targeted harassment, hate speech, doxxing',
    category: 'Harassment',
  },
  {
    title: 'Misleading',
    description: 'Bots, impersonation, spam, scams, misinformation',
    category: 'Misleading',
  },
  {
    title: 'Rule Violations',
    description: 'Site security, stolen content, prohibited sales, ban evasion',
    category: 'Rule Violations',
  },
  {
    title: 'Civic Issues',
    description:
      'Electoral interference, disclosure, misinformation, impersonation',
    category: 'Civic',
  },
  {
    title: 'Appeals',
    description: 'User appeals of moderation actions',
    category: 'Appeal',
  },
]