import type { Condition, Snapshot } from './types'

/** Check action availability against the current subject and account state. */
export function conditionError(
  conditions: Condition[] | undefined,
  state: Snapshot,
): string | undefined {
  for (const condition of conditions || []) {
    const account = condition.target === 'account'
    const tags = account ? state.accountTags : state.subjectTags
    const labels = account ? state.accountLabels : state.subjectLabels
    for (const [kind, values, required, absent] of [
      ['tags', tags, condition.requiredTags, condition.absentTags],
      ['labels', labels, condition.requiredLabels, condition.absentLabels],
    ] as const) {
      const missing = required?.filter((value) => !values.includes(value))
      if (missing?.length)
        return `Missing ${kind} on ${condition.target}: ${missing.join(', ')}`
      const present = absent?.filter((value) => values.includes(value))
      if (present?.length)
        return `Present ${kind} on ${condition.target}: ${present.join(', ')}`
    }
  }
}
