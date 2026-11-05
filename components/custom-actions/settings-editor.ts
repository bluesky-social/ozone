import type { CustomAction, Settings } from './types'
import {
  ADMIN_ROLE,
  importSettings,
  validateJson,
  validateSettings,
} from './validation'

export type SettingsDraft = {
  settings: Settings
  actionId?: string
  isNew?: boolean
  text: string
  initialText: string
}

export function openSettingsDraft(
  settings: Settings,
  actionId?: string,
): SettingsDraft {
  const baseline = validateSettings(settings)
  const value = actionId
    ? baseline.customActions.find((action) => action.id === actionId)
    : baseline
  if (!value) throw new Error('Custom action not found')
  const text = JSON.stringify(value, null, 2)
  return { settings: baseline, actionId, text, initialText: text }
}

export class SettingsConflictError extends Error {}

export function newActionDraft(settings: Settings): SettingsDraft {
  const baseline = validateSettings(settings)
  let number = 1
  const id = () => (number === 1 ? 'new-action' : `new-action-${number}`)
  const name = () =>
    number === 1 ? 'New custom action' : `New custom action ${number}`
  while (
    baseline.customActions.some(
      (action) => action.id === id() || action.name === name(),
    )
  )
    number++
  const action: CustomAction = {
    id: id(),
    name: name(),
    enabled: false,
    allowedRoles: [ADMIN_ROLE],
    subjectTypes: ['account', 'record'],
    actions: [
      {
        id: 'review',
        type: 'event',
        target: 'subject',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventComment',
          comment: 'Reviewed.',
        },
      },
    ],
  }
  const text = JSON.stringify(action, null, 2)
  return { settings: baseline, isNew: true, text, initialText: text }
}

// Ignore object key order when comparing settings read back from the service.
function comparableJson(value: unknown) {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)),
        )
      : entry,
  )
}

/** Validate the complete setting for raw edits, replacements, or additions. */
export function readSettingsDraft(
  draft: SettingsDraft,
  settings = draft.settings,
): Settings {
  if (draft.isNew)
    return validateSettings({
      ...settings,
      customActions: [...settings.customActions, validateJson(draft.text)],
    })
  if (!draft.actionId) return importSettings(draft.text)
  const original = draft.settings.customActions.find(
    (a) => a.id === draft.actionId,
  )
  const index = settings.customActions.findIndex((a) => a.id === draft.actionId)
  if (
    index === -1 ||
    comparableJson(settings.customActions[index]) !== comparableJson(original)
  )
    throw new SettingsConflictError(
      'This custom action changed or was removed while you were editing. Your edits are preserved. Copy them, then reopen the action to review the latest version.',
    )
  return validateSettings({
    ...settings,
    customActions: settings.customActions.map((action, i) =>
      i === index ? validateJson(draft.text) : action,
    ),
  })
}

export type SettingsEditorState = {
  draft: SettingsDraft | null
  discardPending: boolean
}
export const initialEditorState: SettingsEditorState = {
  draft: null,
  discardPending: false,
}
type EditorEvent =
  | { type: 'open'; draft: SettingsDraft }
  | { type: 'change'; text: string }
  | { type: 'back' | 'discard' | 'keep-editing' | 'saved' }

export function settingsEditorReducer(
  state: SettingsEditorState,
  event: EditorEvent,
): SettingsEditorState {
  switch (event.type) {
    case 'open':
      return state.draft ? state : { draft: event.draft, discardPending: false }
    case 'change':
      return state.draft
        ? { draft: { ...state.draft, text: event.text }, discardPending: false }
        : state
    case 'back':
      return state.draft && state.draft.text !== state.draft.initialText
        ? { ...state, discardPending: true }
        : initialEditorState
    case 'keep-editing':
      return { ...state, discardPending: false }
    case 'discard':
    case 'saved':
      return initialEditorState
  }
}
