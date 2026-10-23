import Ajv from 'ajv'
import settingsSchema from './schemas/settings.schema.json'
import type { Settings } from './types'

export const SETTING_KEY = 'tools.ozone.setting.customActions'
export const ADMIN_ROLE = 'tools.ozone.team.defs#roleAdmin'
export const EMPTY_SETTINGS: Settings = { version: 1, customActions: [] }

// Ajv 6 includes Draft-07 and full date-time/URI format validation locally.
const ajv = new Ajv({ allErrors: true, format: 'full', jsonPointers: true })
ajv.addSchema(settingsSchema)
const validateSchema = ajv.getSchema(settingsSchema.$id)!

function disjoint(a: string[] = [], b: string[] = []) {
  if (a.some((v) => b.includes(v)))
    throw new Error(
      'A tag or label cannot be both required/added and absent/removed',
    )
}

/**
 * JSON schema validation. Enforces key uniqueness.
 */
export function validateJson(text: string): unknown {
  const tokens =
    text.match(/"(?:[^"\\]|\\.)*"|[{}\[\],:]|[^\s{}\[\],:]+/g) || []
  const stack: ({ keys: Set<string>; key: boolean } | null)[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === '{') stack.push({ keys: new Set(), key: true })
    else if (token === '[') stack.push(null)
    else if (token === '}' || token === ']') stack.pop()
    else {
      const current = stack[stack.length - 1]
      if (token === ',' && current) current.key = true
      else if (current?.key && token.startsWith('"')) {
        const key = JSON.parse(token) as string
        if (current.keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`)
        current.keys.add(key)
        current.key = false
      }
    }
  }
  return JSON.parse(text)
}

/**
 * Validate custom action settings.
 */
export function validateSettings(value: unknown): Settings {
  function unique(values: string[], what: string) {
    if (new Set(values).size !== values.length)
      throw new Error(`Duplicate ${what}`)
  }

  if (!validateSchema(value))
    throw new Error(
      `Invalid custom actions: ${ajv.errorsText(validateSchema.errors, { separator: '; ' })}`,
    )
  const settings = value as Settings
  unique(
    settings.customActions.map((a) => a.id),
    'action ID',
  )
  unique(
    settings.customActions.map((a) => a.name),
    'action name',
  )
  for (const action of settings.customActions) {
    unique(
      action.actions.map((s) => s.id),
      `step ID in ${action.id}`,
    )
    for (const collection of action.collections || []) {
      if (
        collection.length > 317 ||
        !/^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+\.[a-zA-Z][a-zA-Z0-9]*$/.test(
          collection,
        ) ||
        collection
          .split('.')
          .some((part) => part.length > 63 || part.endsWith('-'))
      )
        throw new Error('Invalid record collection')
    }
    for (const target of ['subject', 'account']) {
      const conditions = (action.when || []).filter(
        (c) =>
          c.target === target ||
          action.subjectTypes.every((t) => t === 'account'),
      )
      disjoint(
        conditions.flatMap((c) => c.requiredTags || []),
        conditions.flatMap((c) => c.absentTags || []),
      )
    }
    for (const step of action.actions) {
      if (step.type !== 'event') continue
      if (step.event.$type === 'tools.ozone.moderation.defs#modEventTag')
        disjoint(step.event.add, step.event.remove)
      if (step.event.$type === 'tools.ozone.moderation.defs#modEventLabel')
        disjoint(step.event.createLabelVals, step.event.negateLabelVals)
    }
  }
  // Copy without changing the original configuration used for export.
  return JSON.parse(JSON.stringify(settings)) as Settings
}

/**
 * Import custom action settings from a JSON string.
 */
export function importSettings(text: string): Settings {
  const value = validateJson(text)
  if (value && typeof value === 'object' && 'options' in value) {
    if (!Array.isArray(value.options))
      throw new Error('Expected an options array')
    return validateSettings(value.options[0]?.value)
  }
  return validateSettings(value)
}
