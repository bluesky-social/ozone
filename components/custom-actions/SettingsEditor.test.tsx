import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CustomActionSettingsContent,
  CustomActionSettingsEditor,
} from './SettingsEditor'
import examples from './fixtures/examples.json'
import {
  initialEditorState,
  newActionDraft,
  openSettingsDraft,
  readSettingsDraft,
  settingsEditorReducer,
  type SettingsEditorState,
} from './settings-editor'
import { ADMIN_ROLE, validateSettings } from './validation'

const environment = vi.hoisted(() => ({
  role: 'tools.ozone.team.defs#roleAdmin',
}))
vi.mock('../shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({
    config: { did: 'did:plc:service' },
    labelerAgent: { did: 'did:plc:moderator' },
    serverConfig: { role: environment.role },
  }),
}))
vi.mock('./useSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./useSettings')>()),
  useCustomActionSettings: () => ({
    data: examples,
    isLoading: false,
    isError: false,
  }),
}))

type Model = ComponentProps<typeof CustomActionSettingsContent>['model']
function model(state: SettingsEditorState = initialEditorState): Model {
  let parsed: Model['parsed']
  try {
    parsed = {
      value: state.draft ? readSettingsDraft(state.draft) : null,
      error: '',
    }
  } catch (error) {
    parsed = { value: null, error: (error as Error).message }
  }
  return {
    query: { isLoading: false, isError: false },
    settings: validateSettings(examples),
    state,
    parsed,
    dispatch: vi.fn(),
    busy: false,
    message: '',
    helpOpen: false,
    setHelpOpen: vi.fn(),
    open: vi.fn(),
    add: vi.fn(),
    back: vi.fn(),
    format: vi.fn(),
    save: vi.fn(),
  }
}
function markup(value = model()) {
  return renderToStaticMarkup(<CustomActionSettingsContent model={value} />)
}
function editorState(actionId?: string) {
  return settingsEditorReducer(initialEditorState, {
    type: 'open',
    draft: openSettingsDraft(validateSettings(examples), actionId),
  })
}
function button(html: string, label: string) {
  return html.match(new RegExp(`<button[^>]*>${label}</button>`))?.[0]
}

beforeEach(() => {
  environment.role = ADMIN_ROLE
})

describe('custom action settings views', () => {
  it('initially shows workflows in configuration order without a version label', () => {
    const html = markup()
    expect(html).not.toContain('Version 1')
    let previous = -1
    for (const action of examples.customActions) {
      const position = html.indexOf(action.name.replaceAll('&', '&amp;'))
      expect(position).toBeGreaterThan(previous)
      previous = position
    }
    expect(html).not.toContain('<textarea')
    expect(button(html, 'Edit raw JSON')).toBeDefined()
    expect(button(html, 'Add')).toBeDefined()
    expect(button(html, 'Export settings')).toBeDefined()
    expect(button(html, 'Help')).toBeDefined()
  })

  it('shows only the selected workflow in the existing JSON form', () => {
    const html = markup(model(editorState('label-account-and-content')))
    expect(html).toContain('Custom action JSON')
    expect(html).toContain('<textarea')
    expect(html).toContain(
      '&quot;id&quot;: &quot;label-account-and-content&quot;',
    )
    expect(html).not.toContain('&quot;customActions&quot;')
    expect(html).not.toContain('Scoped account review')
    for (const label of [
      'Save action',
      'Back to custom actions',
      'Format JSON',
      'Export settings',
    ]) {
      expect(button(html, label)).toBeDefined()
    }
  })

  it('keeps the full JSON editor and replacement save available', () => {
    const html = markup(model(editorState()))
    expect(html).toContain('Custom actions JSON')
    expect(html).toContain('&quot;version&quot;: 1')
    expect(html).toContain('&quot;customActions&quot;')
    expect(html).toContain('&quot;id&quot;: &quot;scoped-account-review&quot;')
    expect(button(html, 'Save replacement')).toBeDefined()
  })

  it('opens a new action in the same JSON editor with a disabled starter definition', () => {
    const state = settingsEditorReducer(initialEditorState, {
      type: 'open',
      draft: newActionDraft(validateSettings(examples)),
    })
    const html = markup(model(state))
    expect(html).toContain('New custom action')
    expect(html).toContain('New actions start disabled.')
    expect(html).toContain('Custom action JSON')
    expect(html).toContain('&quot;enabled&quot;: false')
    expect(html).not.toContain('&quot;customActions&quot;')
    expect(button(html, 'Save action')).not.toContain(' disabled=""')
    expect(button(html, 'Save replacement')).toBeUndefined()
  })

  it('shows validation errors and disables save/export while retaining invalid JSON', () => {
    const state = settingsEditorReducer(editorState('label-and-close'), {
      type: 'change',
      text: '{unfinished',
    })
    const html = markup(model(state))
    expect(html).toContain('{unfinished</textarea>')
    expect(html).toContain('role="alert"')
    expect(button(html, 'Save action')).toContain(' disabled=""')
    expect(button(html, 'Export settings')).toContain(' disabled=""')
  })

  it('asks before discarding edits and locks navigation while a save is pending', () => {
    const changed = settingsEditorReducer(editorState('label-and-close'), {
      type: 'change',
      text: '{unfinished',
    })
    const state = settingsEditorReducer(changed, { type: 'back' })
    const view = model(state)
    const html = markup(view)
    expect(html).toContain('You have unsaved changes.')
    expect(button(html, 'Keep editing')).toBeDefined()
    expect(button(html, 'Discard changes')).toBeDefined()
    view.busy = true
    const saving = markup(view)
    for (const label of [
      'Keep editing',
      'Discard changes',
      'Back to custom actions',
    ]) {
      expect(button(saving, label)).toContain(' disabled=""')
    }
    expect(saving).toContain('disabled="" spellCheck="false"')
  })

  it('retains the draft and reports a failed save', () => {
    const view = model(editorState('label-and-close'))
    view.message = 'Could not update custom actions. Your edits are preserved.'
    const html = markup(view)
    expect(html).toContain('Your edits are preserved.')
    expect(html).toContain('&quot;id&quot;: &quot;label-and-close&quot;')
  })

  it('supports an empty setting and identifies disabled workflows', () => {
    const empty = model()
    empty.settings = { version: 1, customActions: [] }
    expect(markup(empty)).toContain('No custom actions configured.')
    expect(button(markup(empty), 'Add')).not.toContain(' disabled=""')
    expect(button(markup(empty), 'Edit raw JSON')).not.toContain(' disabled=""')
    const disabled = model()
    disabled.settings.customActions[0].enabled = false
    expect(markup(disabled)).toContain('Disabled</span>')
  })

  it('does not show an empty configuration during loading or failed reads', () => {
    const view = model()
    view.query = { ...view.query, isLoading: true }
    const loading = markup(view)
    expect(loading).toContain('Loading custom actions…')
    expect(loading).not.toContain('Version 1')
    expect(loading).not.toContain('No custom actions configured.')
    expect(button(loading, 'Edit raw JSON')).toContain(' disabled=""')
    expect(button(loading, 'Add')).toContain(' disabled=""')
    view.query = { ...view.query, isLoading: false, isError: true }
    const failed = markup(view)
    expect(failed).toContain('The stored setting is invalid or unavailable.')
    expect(failed).not.toContain('<ul')
    expect(failed).not.toContain('Version 1')
    expect(button(failed, 'Edit raw JSON')).not.toContain(' disabled=""')
    expect(button(failed, 'Add')).toContain(' disabled=""')
  })

  it.each([ADMIN_ROLE, 'tools.ozone.team.defs#roleModerator'])(
    'keeps settings admin-only: %s',
    (role) => {
      environment.role = role
      const client = new QueryClient()
      const html = renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <CustomActionSettingsEditor />
        </QueryClientProvider>,
      )
      if (role === ADMIN_ROLE) {
        expect(html).toContain('aria-label="Custom actions"')
        expect(html).toContain('Edit raw JSON')
      } else expect(html).toBe('')
      client.clear()
    },
  )
})
