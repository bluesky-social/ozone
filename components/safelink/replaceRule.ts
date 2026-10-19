import {
  DEFAULT_SAFELINK_SOURCE,
  getSafelinkSource,
  type SafelinkRule,
  type SafelinkRuleData,
} from './types'

type SourceRuleData = SafelinkRuleData & { source: string }

type SafelinkClient = {
  removeRule: (input: {
    url: string
    pattern: SafelinkRule['pattern']
    source: string
    comment: string
  }) => Promise<unknown>
  addRule: (input: SourceRuleData) => Promise<unknown>
}

export async function replaceSafelinkRule(
  client: SafelinkClient,
  currentRule: SafelinkRule,
  replacement: SafelinkRuleData,
): Promise<void> {
  const source = getSafelinkSource(currentRule)
  if (source === DEFAULT_SAFELINK_SOURCE) {
    throw new Error('This rule is already managed in Ozone')
  }

  const restoreOriginalRule = () =>
    client.addRule({
      url: currentRule.url,
      pattern: currentRule.pattern,
      action: currentRule.action,
      reason: currentRule.reason,
      comment: currentRule.comment,
      source,
    })

  try {
    await client.removeRule({
      url: currentRule.url,
      pattern: currentRule.pattern,
      source,
      comment: 'Replaced via Ozone',
    })
    await client.addRule({
      ...replacement,
      url: currentRule.url,
      pattern: currentRule.pattern,
      source: DEFAULT_SAFELINK_SOURCE,
    })
  } catch {
    try {
      await restoreOriginalRule()
    } catch {
      throw new Error(
        'The replacement failed, and the original rule could not be confirmed or restored. Check the current rule before retrying.',
      )
    }
    throw new Error('The replacement failed. The original rule is in place.')
  }
}
