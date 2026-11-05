import type { Agent } from '@atproto/api'
import { describe, expect, it, vi } from 'vitest'
import examples from './fixtures/examples.json'
import {
  initialEditorState,
  newActionDraft,
  openSettingsDraft,
  readSettingsDraft,
  SettingsConflictError,
  settingsEditorReducer,
} from './settings-editor'
import type { Settings } from './types'
import { saveSettingsDraft } from './useSettings'
import { ADMIN_ROLE, SETTING_KEY, validateSettings } from './validation'

vi.mock('../shell/ConfigurationContext', () => ({
  useConfigurationContext: vi.fn(),
}))

const settings = () => validateSettings(examples)
const selectedId = 'label-account-and-content'
function editedDraft() {
  const baseline = settings()
  const draft = openSettingsDraft(baseline, selectedId)
  const edited = {
    ...baseline.customActions[1],
    id: 'renamed-action',
    name: 'Renamed workflow',
  }
  return { ...draft, text: JSON.stringify(edited) }
}
function agentFixture(value: Settings | null = settings()) {
  const upsertOption = vi.fn().mockResolvedValue({})
  const getConfig = vi
    .fn()
    .mockResolvedValue({ data: { viewer: { role: ADMIN_ROLE } } })
  const listOptions = vi
    .fn()
    .mockResolvedValue({ data: { options: value ? [{ value }] : [] } })
  const agent = {
    tools: {
      ozone: {
        server: { getConfig },
        setting: { listOptions, upsertOption },
      },
    },
  } as unknown as Agent
  return { agent, upsertOption, getConfig, listOptions }
}

describe('individual workflow editing', () => {
  it('opens just the selected object and preserves its neighbors and ordering when renamed', () => {
    const draft = editedDraft()
    expect(JSON.parse(draft.initialText)).toEqual(
      draft.settings.customActions[1],
    )
    const next = readSettingsDraft(draft)
    expect(next.version).toBe(1)
    expect(next.customActions.map((a) => a.id)).toEqual(
      draft.settings.customActions.map((a, i) =>
        i === 1 ? 'renamed-action' : a.id,
      ),
    )
    expect(next.customActions[1].name).toBe('Renamed workflow')
    for (const index of [0, 2, 3, 4])
      expect(next.customActions[index]).toEqual(
        draft.settings.customActions[index],
      )
    expect(draft.settings).toEqual(settings())
  })

  it.each(['id', 'name'] as const)(
    'validates duplicate %s across the entire setting',
    (field) => {
      const draft = editedDraft()
      const value = JSON.parse(draft.text)
      value[field] = draft.settings.customActions[0][field]
      expect(() =>
        readSettingsDraft({ ...draft, text: JSON.stringify(value) }),
      ).toThrow('Duplicate')
    },
  )

  it.each([
    '{',
    'null',
    '[]',
    '{"id":"first","id":"second"}',
    JSON.stringify(examples),
  ])(
    'rejects invalid action JSON without modifying the original setting: %s',
    (text) => {
      const draft = { ...editedDraft(), text }
      expect(() => readSettingsDraft(draft)).toThrow()
      expect(draft.settings).toEqual(settings())
      expect(draft.text).toBe(text)
    },
  )

  it('retains newer neighboring edits and the latest order when applying a selected action', () => {
    const draft = editedDraft()
    const current = settings()
    current.customActions.reverse()
    current.customActions[0].helpText = 'A newer unrelated edit'
    const next = readSettingsDraft(draft, current)
    expect(next.customActions.map((a) => a.id)).toEqual(
      current.customActions.map((a) =>
        a.id === selectedId ? 'renamed-action' : a.id,
      ),
    )
    expect(next.customActions[0]).toEqual(current.customActions[0])
  })

  it.each(['changed', 'removed'] as const)(
    'rejects a selected action that was %s and retains the draft',
    (change) => {
      const draft = editedDraft()
      const current = settings()
      if (change === 'changed')
        current.customActions[1].helpText = 'New instructions'
      else current.customActions.splice(1, 1)
      expect(() => readSettingsDraft(draft, current)).toThrow(
        SettingsConflictError,
      )
      expect(draft.text).toContain('Renamed workflow')
    },
  )

  it('ignores object key ordering when checking for concurrent changes', () => {
    const draft = editedDraft()
    const reordered = JSON.parse(
      JSON.stringify(settings(), (_key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).reverse())
          : value,
      ),
    ) as Settings
    expect(readSettingsDraft(draft, reordered).customActions[1].name).toBe(
      'Renamed workflow',
    )
  })

  it('freezes the baseline against refetched configuration changes', () => {
    const original = settings()
    const draft = openSettingsDraft(original, selectedId)
    original.customActions[1].name = 'Changed after opening'
    expect(JSON.parse(draft.text).name).toBe(
      'Label account and content, and close report',
    )
    expect(draft.settings.customActions[1].name).not.toBe(
      original.customActions[1].name,
    )
  })
})

describe('raw JSON editing', () => {
  it('keeps full replacement, reordering, adding, and removing workflows available', () => {
    const draft = openSettingsDraft(settings())
    const replacement: Settings = {
      version: 1,
      customActions: [
        draft.settings.customActions[2],
        {
          ...draft.settings.customActions[0],
          id: 'added',
          name: 'Added workflow',
        },
      ],
    }
    expect(JSON.parse(draft.text)).toEqual(settings())
    expect(
      readSettingsDraft({ ...draft, text: JSON.stringify(replacement) }),
    ).toEqual(replacement)
    expect(
      readSettingsDraft({ ...draft, text: '{"version":1,"customActions":[]}' })
        .customActions,
    ).toEqual([])
  })

  it('imports envelopes without adopting scope or manager-role overrides', () => {
    const draft = openSettingsDraft(settings())
    const next = readSettingsDraft({
      ...draft,
      text: JSON.stringify({
        options: [
          { value: settings(), scope: 'personal', managerRole: 'triage' },
        ],
      }),
    })
    expect(next).toEqual(settings())
  })
})

describe('adding a custom action', () => {
  it('starts a valid disabled action and appends it without changing existing definitions', () => {
    const baseline = settings()
    const draft = newActionDraft(baseline)
    const action = JSON.parse(draft.text)
    expect(action.enabled).toBe(false)
    expect(action.allowedRoles).toEqual([ADMIN_ROLE])
    expect(action.actions).toHaveLength(1)
    const next = readSettingsDraft(draft)
    expect(next.customActions.slice(0, -1)).toEqual(baseline.customActions)
    expect(next.customActions.at(-1)).toEqual(action)
    expect(baseline).toEqual(settings())
  })

  it('generates unique starter IDs and names for repeated additions', () => {
    const first = readSettingsDraft(newActionDraft(settings()))
    const second = readSettingsDraft(newActionDraft(first))
    expect(second.customActions.at(-1)?.id).toBe('new-action-2')
    expect(second.customActions.at(-1)?.name).toBe('New custom action 2')
  })

  it.each(['id', 'name'] as const)(
    'rejects an edited new action with a duplicate %s',
    (field) => {
      const draft = newActionDraft(settings())
      const action = JSON.parse(draft.text)
      action[field] = draft.settings.customActions[0][field]
      expect(() =>
        readSettingsDraft({ ...draft, text: JSON.stringify(action) }),
      ).toThrow('Duplicate')
    },
  )

  it('appends to the latest configuration, preserving newer edits and order', async () => {
    const draft = newActionDraft(settings())
    const current = settings()
    current.customActions.reverse()
    current.customActions[0].helpText = 'Newer instructions'
    const { agent, upsertOption } = agentFixture(current)
    const next = await saveSettingsDraft(agent, ADMIN_ROLE, draft)
    expect(next.customActions.slice(0, -1)).toEqual(current.customActions)
    expect(next.customActions.at(-1)).toEqual(JSON.parse(draft.text))
    expect(upsertOption.mock.calls[0][0].value).toEqual(next)
  })

  it('can create the first action when no setting exists', async () => {
    const draft = newActionDraft({ version: 1, customActions: [] })
    const { agent } = agentFixture(null)
    const next = await saveSettingsDraft(agent, ADMIN_ROLE, draft)
    expect(next.customActions).toEqual([JSON.parse(draft.text)])
  })

  it.each(['id', 'name'] as const)(
    'retains the draft and blocks writes if its %s is taken before saving',
    async (field) => {
      const draft = newActionDraft(settings())
      const current = settings()
      const added = JSON.parse(draft.text)
      if (field === 'id') added.name = 'Another addition'
      else added.id = 'another-addition'
      current.customActions.push(added)
      const { agent, upsertOption } = agentFixture(current)
      await expect(saveSettingsDraft(agent, ADMIN_ROLE, draft)).rejects.toThrow(
        SettingsConflictError,
      )
      expect(upsertOption).not.toHaveBeenCalled()
      expect(draft.text).toBe(draft.initialText)
    },
  )

  it('keeps the new draft after a rejected save and still rechecks the admin role', async () => {
    const draft = newActionDraft(settings())
    const { agent, upsertOption, getConfig } = agentFixture()
    upsertOption.mockRejectedValueOnce(new Error('offline'))
    await expect(saveSettingsDraft(agent, ADMIN_ROLE, draft)).rejects.toThrow(
      'offline',
    )
    expect(draft.text).toContain('New custom action')
    getConfig.mockResolvedValue({
      data: { viewer: { role: 'tools.ozone.team.defs#roleTriage' } },
    })
    await expect(saveSettingsDraft(agent, ADMIN_ROLE, draft)).rejects.toThrow(
      'Only admins',
    )
    expect(upsertOption).toHaveBeenCalledOnce()
  })
})

describe('editor navigation', () => {
  it.each([selectedId, undefined])(
    'requires an explicit discard before leaving modified JSON: %s',
    (actionId) => {
      const opened = settingsEditorReducer(initialEditorState, {
        type: 'open',
        draft: openSettingsDraft(settings(), actionId),
      })
      const changed = settingsEditorReducer(opened, {
        type: 'change',
        text: '{invalid draft',
      })
      const back = settingsEditorReducer(changed, { type: 'back' })
      expect(back.discardPending).toBe(true)
      expect(back.draft?.text).toBe('{invalid draft')
      expect(settingsEditorReducer(back, { type: 'keep-editing' })).toEqual(
        changed,
      )
      expect(
        settingsEditorReducer(back, {
          type: 'open',
          draft: openSettingsDraft(settings()),
        }),
      ).toEqual(back)
      expect(settingsEditorReducer(back, { type: 'discard' }).draft).toBeNull()
    },
  )

  it('returns to the list without confirmation when untouched, and after a confirmed save', () => {
    const state = settingsEditorReducer(initialEditorState, {
      type: 'open',
      draft: editedDraft(),
    })
    expect(settingsEditorReducer(state, { type: 'saved' })).toEqual(
      initialEditorState,
    )
    const untouched = settingsEditorReducer(initialEditorState, {
      type: 'open',
      draft: openSettingsDraft(settings(), selectedId),
    })
    expect(settingsEditorReducer(untouched, { type: 'back' })).toEqual(
      initialEditorState,
    )
  })
})

describe('settings draft saves', () => {
  it('reads the latest neighbors and writes an admin-managed instance setting', async () => {
    const current = settings()
    current.customActions.reverse()
    const { agent, upsertOption, listOptions } = agentFixture(current)
    const next = await saveSettingsDraft(agent, ADMIN_ROLE, editedDraft())
    expect(listOptions).toHaveBeenCalledOnce()
    expect(next).toEqual(readSettingsDraft(editedDraft(), current))
    expect(upsertOption).toHaveBeenCalledOnce()
    expect(upsertOption).toHaveBeenCalledWith({
      key: SETTING_KEY,
      scope: 'instance',
      managerRole: ADMIN_ROLE,
      value: next,
    })
  })

  it('keeps the original raw replacement save behavior', async () => {
    const { agent, listOptions, upsertOption } = agentFixture()
    const draft = {
      ...openSettingsDraft(settings()),
      text: '{"version":1,"customActions":[]}',
    }
    await saveSettingsDraft(agent, ADMIN_ROLE, draft)
    expect(listOptions).not.toHaveBeenCalled()
    expect(upsertOption.mock.calls[0][0].value.customActions).toEqual([])
  })

  it('rejects invalid drafts before reads or writes', async () => {
    const { agent, listOptions, upsertOption } = agentFixture()
    await expect(
      saveSettingsDraft(agent, ADMIN_ROLE, { ...editedDraft(), text: '{' }),
    ).rejects.toThrow()
    expect(listOptions).not.toHaveBeenCalled()
    expect(upsertOption).not.toHaveBeenCalled()
  })

  it('retains edits on failed saves without writing partial configuration', async () => {
    const { agent, upsertOption } = agentFixture()
    upsertOption.mockRejectedValue(new Error('offline'))
    const draft = editedDraft()
    await expect(saveSettingsDraft(agent, ADMIN_ROLE, draft)).rejects.toThrow(
      'offline',
    )
    expect(draft.text).toContain('Renamed workflow')
    expect(draft.settings).toEqual(settings())
    expect(upsertOption).toHaveBeenCalledOnce()
  })

  it.each(['removed', 'changed', 'missing setting'] as const)(
    'does not write when the selected action has %s',
    async (change) => {
      const current = settings()
      if (change === 'removed') current.customActions.splice(1, 1)
      else current.customActions[1].name = 'Changed elsewhere'
      const { agent, upsertOption } = agentFixture(
        change === 'missing setting' ? null : current,
      )
      await expect(
        saveSettingsDraft(agent, ADMIN_ROLE, editedDraft()),
      ).rejects.toThrow(SettingsConflictError)
      expect(upsertOption).not.toHaveBeenCalled()
    },
  )

  it.each(['triage', 'role-lost'] as const)(
    'rejects saves without an admin role: %s',
    async (kind) => {
      const { agent, getConfig, upsertOption } = agentFixture()
      getConfig.mockResolvedValue({
        data: { viewer: { role: 'tools.ozone.team.defs#roleTriage' } },
      })
      await expect(
        saveSettingsDraft(
          agent,
          kind === 'triage' ? 'tools.ozone.team.defs#roleTriage' : ADMIN_ROLE,
          editedDraft(),
        ),
      ).rejects.toThrow('Only admins')
      expect(upsertOption).not.toHaveBeenCalled()
    },
  )
})
