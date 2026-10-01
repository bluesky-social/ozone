import type { Agent } from '@atproto/api'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef, prepare, readSnapshot } from './compile'
import {
  createRun,
  dispatch,
  eventMetadata,
  executeRun,
  RUN_TIMEOUT_MS,
} from './execution'
import settingsFixture from './fixtures/settings.json'
import { loadSettings, manageSettings } from './useSettings'
import type { CustomAction, Receipt, Run, Snapshot, Subject } from './types'
import {
  ADMIN_ROLE,
  importSettings,
  validateJson,
  SETTING_KEY,
  validateSettings,
} from './validation'

vi.mock('../shell/ConfigurationContext', () => ({
  useConfigurationContext: vi.fn(),
}))

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
})
afterEach(() => {
  vi.useRealTimers()
})
const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const serviceDid = 'did:plc:dddddddddddddddddddddddd'
const moderator = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'
const issuer = 'did:plc:cccccccccccccccccccccccc'
const tag = (
  id = 'tag',
): Extract<CustomAction['actions'][number], { type: 'event' }> => ({
  id,
  type: 'event',
  target: 'account',
  event: {
    $type: 'tools.ozone.moderation.defs#modEventTag',
    add: ['review:example'],
    remove: [],
  },
})
const action = (): CustomAction => ({
  id: 'review',
  name: 'Review',
  allowedRoles: [ADMIN_ROLE],
  subjectTypes: ['account', 'record'],
  actions: [tag(), tag('tag-again')],
})
function snapshot(): Snapshot {
  return {
    context: {
      serviceDid,
      uiOrigin: 'https://ozone.example',
      moderator: { did: moderator },
      subject: accountRef(did),
      owningAccountDid: did,
      confirmedInputs: {},
      report: {
        id: 123,
        url: 'https://ozone.example/reports/123',
      },
    },
    config: parseServerConfig({
      viewer: { role: ADMIN_ROLE },
      pds: { url: 'https://pds.example' },
      verifierDid: issuer,
      chat: { url: 'https://chat.example' },
    }),
    subjectTags: [],
    accountTags: [],
    protectedTags: {},
    policies: {},
    profile: { handle: 'example.test', displayName: 'Example' },
  }
}
const eventReceipt = (eventId = 1): Receipt => ({
  kind: 'moderation-event',
  eventId,
  url: `https://ozone.example/events/${eventId}`,
})
function runnerFixture(a = action()) {
  const run = createRun(a, snapshot())
  const deps = {
    changed: vi.fn(),
    dispatch: vi.fn().mockResolvedValue(eventReceipt()),
    prepare: vi.fn().mockResolvedValue(undefined),
  }
  const controller = new AbortController()
  const execute = () => executeRun(run, deps, controller)
  return { execute, deps, run, controller }
}
function agentWith(api: object) {
  return { did: moderator, tools: { ozone: api } } as unknown as Agent
}

describe('configuration contract', () => {
  it('validates the specification settings fixture', () => {
    expect(validateSettings(settingsFixture).customActions).toHaveLength(7)
  })
  it.each([
    'admin',
    'moderator',
    'triage',
    'verifier',
    'example.team.defs#roleAdmin',
    'tools.ozone.team.defs#roleadmin',
  ])('rejects an invalid allowed role: %s', (role) => {
    expect(() =>
      validateSettings({
        version: 1,
        customActions: [{ ...action(), allowedRoles: [role] }],
      }),
    ).toThrow()
  })
  it.each([
    '{"version":1,"version":1,"customActions":[]}',
    '{"a":{"x":1,"\\u0078":2}}',
    '{"a":[{"x":1,"x":2}]}',
  ])('rejects duplicate keys before parsing: %s', (source) =>
    expect(() => validateJson(source)).toThrow('Duplicate'),
  )
  it('allows the same key in distinct objects', () =>
    expect(validateJson('[{"x":1},{"x":2}]')).toEqual([{ x: 1 }, { x: 2 }]))
  it.each(['', ' ', '\n\t', 1, null])(
    'rejects blank or invalid helpText: %s',
    (helpText) =>
      expect(() =>
        validateSettings({
          version: 1,
          customActions: [{ ...action(), helpText }],
        }),
      ).toThrow(),
  )
  it('preserves multiline help text literally', () => {
    const helpText = '<b>Review</b>\n{{account}} **carefully**'
    expect(
      validateSettings({
        version: 1,
        customActions: [{ ...action(), helpText }],
      }).customActions[0].helpText,
    ).toBe(helpText)
  })
  it.each([
    (a: any) => {
      a.events = a.actions
      delete a.actions
    },
    (a: any) => {
      a.actions[0].event.add.push('review:example')
    },
    (a: any) => {
      a.actions[0].event.remove = ['review:example']
    },
    (a: any) => {
      a.actions[0].reportAction = { scope: 'current' }
    },
    (a: any) => {
      a.actions[1].id = a.actions[0].id
    },
    (a: any) => {
      a.allowedRoles = ['lead']
    },
    (a: any) => {
      a.collections = ['not-an-nsid']
    },
    (a: any) => {
      a.actions[0] = {
        id: 'bad',
        type: 'activity',
        target: 'report',
        activity: { $type: 'tools.ozone.report.defs#noteActivity' },
      }
    },
    (a: any) => {
      a.actions[0] = {
        id: 'bad',
        type: 'activity',
        target: 'report',
        activity: { $type: 'tools.ozone.report.defs#assignmentActivity' },
      }
    },
    (a: any) => {
      a.actions[0].event.durationInHours = 0
    },
  ])('rejects unsupported or contradictory definitions', (mutate) => {
    const a = action()
    mutate(a)
    expect(() => validateSettings({ version: 1, customActions: [a] })).toThrow()
  })
  it('rejects duplicate names and IDs across actions', () => {
    expect(() =>
      validateSettings({ version: 1, customActions: [action(), action()] }),
    ).toThrow('Duplicate')
    expect(() =>
      validateSettings({
        version: 1,
        customActions: [action(), { ...action(), id: 'second' }],
      }),
    ).toThrow('name')
  })
  it('imports the first option value without ownership metadata or merging later entries', () => {
    const value = { version: 1, customActions: [action()] }
    expect(
      importSettings(
        JSON.stringify({
          options: [
            {
              key: SETTING_KEY,
              scope: 'instance',
              value,
              did,
              managerRole: 'triage',
            },
            {
              key: SETTING_KEY,
              scope: 'instance',
              value: { version: 1, customActions: [] },
            },
          ],
        }),
      ),
    ).toEqual(value)
    expect(() => importSettings('{"options":[]}')).toThrow()
    expect(() =>
      importSettings(
        JSON.stringify({ options: [{ value: 'bad' }, { value }] }),
      ),
    ).toThrow()
  })
})

describe('settings API boundary', () => {
  it('always pins saves to admin-managed instance scope', async () => {
    const upsertOption = vi.fn().mockResolvedValue({})
    const agent = agentWith({
      server: {
        getConfig: vi
          .fn()
          .mockResolvedValue({ data: { viewer: { role: ADMIN_ROLE } } }),
      },
      setting: { upsertOption },
    })
    await manageSettings(agent, ADMIN_ROLE, 'save', {
      version: 1,
      customActions: [action()],
    })
    expect(upsertOption).toHaveBeenCalledWith(
      expect.objectContaining({
        key: SETTING_KEY,
        scope: 'instance',
        managerRole: ADMIN_ROLE,
      }),
    )
    await manageSettings(agent, ADMIN_ROLE, 'clear')
    expect(upsertOption).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: { version: 1, customActions: [] } }),
    )
  })
  it('refuses management after role loss', async () => {
    const upsertOption = vi.fn()
    const agent = agentWith({
      server: {
        getConfig: vi.fn().mockResolvedValue({
          data: { viewer: { role: 'tools.ozone.team.defs#roleTriage' } },
        }),
      },
      setting: { upsertOption },
    })
    await expect(manageSettings(agent, ADMIN_ROLE, 'clear')).rejects.toThrow(
      'admins',
    )
    expect(upsertOption).not.toHaveBeenCalled()
  })
  it('reads an already-decoded setting and rejects malformed values', async () => {
    const listOptions = vi.fn().mockResolvedValue({
      data: {
        options: [
          {
            key: SETTING_KEY,
            scope: 'instance',
            value: { version: 1, customActions: [] },
          },
          {
            key: SETTING_KEY,
            scope: 'instance',
            value: { version: 1, customActions: [action()] },
          },
        ],
      },
    })
    expect(await loadSettings(agentWith({ setting: { listOptions } }))).toEqual(
      { version: 1, customActions: [] },
    )
    listOptions.mockResolvedValue({
      data: {
        options: [{ key: SETTING_KEY, scope: 'instance', value: 'bad' }],
      },
    })
    await expect(
      loadSettings(agentWith({ setting: { listOptions } })),
    ).rejects.toThrow()
  })
  it('deletes only this key and confirms absence', async () => {
    const removeOptions = vi.fn().mockResolvedValue({})
    const listOptions = vi.fn().mockResolvedValue({ data: { options: [] } })
    const agent = agentWith({
      server: {
        getConfig: vi
          .fn()
          .mockResolvedValue({ data: { viewer: { role: ADMIN_ROLE } } }),
      },
      setting: { removeOptions, listOptions },
    })
    await manageSettings(agent, ADMIN_ROLE, 'delete')
    expect(removeOptions).toHaveBeenCalledWith({
      keys: [SETTING_KEY],
      scope: 'instance',
    })
    expect(listOptions).toHaveBeenCalled()
  })
})

describe('preparation', () => {
  it('compares record references by URI and CID regardless of property order', async () => {
    const subject: Subject = {
      cid: 'bafyexample',
      uri: `at://${did}/app.bsky.feed.post/example`,
      $type: 'com.atproto.repo.strongRef',
    }
    const getRecord = vi.fn().mockResolvedValue({
      data: { uri: subject.uri, cid: subject.cid, moderation: {} },
    })
    const agent = agentWith({
      server: {
        getConfig: vi
          .fn()
          .mockResolvedValue({ data: { viewer: { role: ADMIN_ROLE } } }),
      },
      moderation: {
        getRepo: vi.fn().mockResolvedValue({ data: { moderation: {} } }),
        getRecord,
      },
      setting: {
        listOptions: vi.fn().mockResolvedValue({ data: { options: [] } }),
      },
    })
    const read = () =>
      readSnapshot(agent, serviceDid, 'https://ozone.example', subject)
    expect((await read()).context.subject).toEqual(subject)
    for (const record of [
      { uri: subject.uri, cid: 'bafychanged' },
      { uri: `${subject.uri}-other`, cid: subject.cid },
    ]) {
      getRecord.mockResolvedValue({ data: { ...record, moderation: {} } })
      await expect(read()).rejects.toThrow('subject reference changed')
    }
  })
  it.each(['Admin', 'Moderator', 'Triage', 'Verifier'])(
    'accepts the explicit full %s role',
    (name) => {
      const role = `tools.ozone.team.defs#role${name}`
      const state = snapshot()
      state.config = parseServerConfig({ viewer: { role } })
      const workflow = { ...action(), allowedRoles: [role] }
      expect(prepare(workflow, state)).toHaveLength(2)
    },
  )
  it.each([
    undefined,
    'admin',
    'example.team.defs#roleAdmin',
    'tools.ozone.team.defs#roleadmin',
    'tools.ozone.team.defs#roleModerator',
  ])('rejects a server role outside the exact allowlist: %s', (role) => {
    const state = snapshot()
    state.config = parseServerConfig({ viewer: { role } })
    expect(() => prepare(action(), state)).toThrow('not enabled for your role')
  })
  it('requires admins to be explicitly allowed', () => {
    const workflow = {
      ...action(),
      allowedRoles: ['tools.ozone.team.defs#roleModerator'],
    }
    expect(() => prepare(workflow, snapshot())).toThrow(
      'not enabled for your role',
    )
  })
  it('keeps record and owner targets separate, with report closure independent', () => {
    const state = snapshot()
    state.context.subject = {
      $type: 'com.atproto.repo.strongRef',
      uri: `at://${did}/app.bsky.feed.post/abc`,
      cid: 'bafyexample',
    }
    const a = action()
    a.actions = [
      { ...tag(), target: 'subject' },
      tag('owner'),
      {
        id: 'close',
        type: 'activity',
        target: 'report',
        activity: { $type: 'tools.ozone.report.defs#closeActivity' },
      },
    ]
    const ops = prepare(a, state)
    expect(ops[0].subject).toEqual(state.context.subject)
    expect(ops[1].subject).toEqual(accountRef(did))
    expect(ops[2].request).toEqual({
      endpoint: 'tools.ozone.report.createActivity',
      body: {
        reportId: 123,
        activity: { $type: 'tools.ozone.report.defs#closeActivity' },
        isAutomated: false,
      },
    })
  })
  it('rejects report requirements without explicit report context', () => {
    const state = snapshot()
    state.context.report = null
    const a = action()
    a.actions.push({
      id: 'close',
      type: 'activity',
      target: 'report',
      activity: { $type: 'tools.ozone.report.defs#closeActivity' },
    })
    expect(() => prepare(a, state)).toThrow('current report')
  })
  it('builds repeated report activities without simulating status transitions', () => {
    const a = action()
    a.actions.push(
      ...['close', 'close-again'].map((id) => ({
        id,
        type: 'activity' as const,
        target: 'report' as const,
        activity: { $type: 'tools.ozone.report.defs#closeActivity' as const },
      })),
    )
    expect(
      prepare(a, snapshot())
        .slice(-2)
        .map((op) => op.request.body),
    ).toEqual([
      {
        reportId: 123,
        activity: { $type: 'tools.ozone.report.defs#closeActivity' },
        isAutomated: false,
      },
      {
        reportId: 123,
        activity: { $type: 'tools.ozone.report.defs#closeActivity' },
        isAutomated: false,
      },
    ])
  })
  it('does not let account enforcement link a record report', () => {
    const a = action()
    a.actions = [
      {
        id: 'label',
        type: 'event',
        target: 'account',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventLabel',
          createLabelVals: ['porn'],
          negateLabelVals: [],
        },
        reportAction: { scope: 'current' },
      },
    ]
    const state = snapshot()
    state.context.subject = {
      $type: 'com.atproto.repo.strongRef',
      uri: `at://${did}/app.bsky.feed.post/abc`,
      cid: 'bafyexample',
    }
    expect(() => prepare(a, state)).toThrow('same subject')
  })
  it('expands reportAction at the request root', () => {
    const a = action()
    a.actions = [
      {
        id: 'label',
        type: 'event',
        target: 'subject',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventLabel',
          createLabelVals: ['porn'],
          negateLabelVals: [],
        },
        reportAction: { scope: 'current', note: 'Reviewed' },
      },
    ]
    expect(prepare(a, snapshot())[0].request.body).toMatchObject({
      reportAction: { ids: [123], note: 'Reviewed' },
    })
  })
  it('accepts label values without service definitions and still requires label permission', () => {
    const a = action()
    const event = {
      $type: 'tools.ozone.moderation.defs#modEventLabel' as const,
      createLabelVals: ['test-label'],
      negateLabelVals: ['retired-label'],
    }
    a.actions = [{ id: 'label', type: 'event', target: 'subject', event }]
    const state = snapshot()
    expect(prepare(a, state)[0].request.body).toMatchObject({ event })

    state.config.permissions.canLabel = false
    expect(() => prepare(a, state)).toThrow('Label permission required')
  })
  it('checks protected tag restrictions even for admins', () => {
    const state = snapshot()
    state.protectedTags['review:example'] = {
      moderators: ['did:plc:someoneelse'],
    }
    expect(() => prepare(action(), state)).toThrow('protected tag')
  })
  it('builds repeated takedowns without predicting subject state', () => {
    const a = action()
    a.actions = ['first', 'second'].map((id) => ({
      id,
      type: 'event',
      target: 'subject',
      event: { $type: 'tools.ozone.moderation.defs#modEventTakedown' },
    }))
    expect(prepare(a, snapshot())).toHaveLength(2)
  })
  it.each([true, false])(
    'allows repeated DM restriction tag changes with enabled=%s',
    (enabled) => {
      const a = action()
      a.actions = ['first', 'second'].map((id) => ({
        id,
        type: 'event',
        target: 'account',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventTag',
          add: enabled ? [] : ['chat-disabled'],
          remove: enabled ? ['chat-disabled'] : [],
        },
      }))
      for (const tags of [[], ['chat-disabled']]) {
        const state = snapshot()
        state.subjectTags = state.accountTags = tags
        expect(prepare(a, state)).toHaveLength(2)
      }
    },
  )
  it('uses current protected tags for permissions without predicting tag changes', () => {
    const a = action()
    a.actions = [
      {
        id: 'add-tag',
        type: 'event',
        target: 'subject',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventTag',
          add: ['review:example'],
          remove: [],
        },
      },
      {
        id: 'label',
        type: 'event',
        target: 'subject',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventLabel',
          createLabelVals: ['test-label'],
          negateLabelVals: [],
        },
      },
    ]
    const state = snapshot()
    state.subjectTags = state.accountTags = ['protected']
    state.protectedTags.protected = { moderators: ['did:plc:someoneelse'] }
    expect(() => prepare(a, state)).toThrow('protected tag')
  })
  it('checks tag conditions before starting', () => {
    const a = action()
    a.when = [{ target: 'account', requiredTags: ['old'] }]
    const state = snapshot()
    expect(() => prepare(a, state)).toThrow('conditions')
    state.accountTags = ['old']
    expect(prepare(a, state)).toHaveLength(2)
  })
  it('allows non-closing work with or without report context', () => {
    const state = snapshot()
    expect(prepare(action(), state)).toHaveLength(2)
    state.context.report = null
    expect(prepare(action(), state)).toHaveLength(2)
  })
})

describe('bounded one-shot execution', () => {
  it('runs in order and publishes running state and confirmed receipts', async () => {
    const { execute, deps, run } = runnerFixture()
    deps.dispatch.mockImplementation(async (_run, op) => {
      const progress = deps.changed.mock.lastCall?.[0] as Run
      expect(progress.operations.find((o) => o.id === op.id)?.status).toBe(
        'running',
      )
      if (op.id === 'tag-again')
        expect(progress.operations[0].receipt).toEqual(eventReceipt())
      return eventReceipt()
    })
    await execute()
    expect(deps.dispatch.mock.calls.map((call) => call[1].stepId)).toEqual([
      'tag',
      'tag-again',
    ])
    expect(run.status).toBe('succeeded')
    await execute()
    expect(deps.dispatch).toHaveBeenCalledTimes(2)
  })
  it.each([403, 500])('stops on HTTP %s and never retries', async (status) => {
    const a = action()
    a.actions.push(tag('unsent'))
    const { execute, deps, run } = runnerFixture(a)
    deps.dispatch
      .mockResolvedValueOnce(eventReceipt())
      .mockRejectedValueOnce({ status })
    await execute()
    expect(run.status).toBe('failed')
    expect(run.operations.map((o) => o.status)).toEqual([
      'succeeded',
      'failed',
      'skipped',
    ])
    expect(run.operations[0].receipt).toEqual(eventReceipt())
    await execute()
    expect(deps.dispatch).toHaveBeenCalledTimes(2)
  })
  it('does not duplicate the same run when execute is called concurrently', async () => {
    const { execute, deps } = runnerFixture()
    await Promise.all([execute(), execute()])
    expect(deps.dispatch).toHaveBeenCalledTimes(2)
  })
  it('stops without writing when preflight fails', async () => {
    const { execute, deps, run } = runnerFixture()
    deps.prepare.mockRejectedValue(new Error('offline'))
    await execute()
    expect(deps.dispatch).not.toHaveBeenCalled()
    expect(run.operations.map((o) => o.status)).toEqual(['skipped', 'skipped'])
  })
  it('uses one 60-second deadline across preflight and all steps and ignores late responses', async () => {
    vi.useFakeTimers()
    const a = action()
    a.actions.push(tag('unsent'))
    const { execute, deps, run } = runnerFixture(a)
    let finishLate: (receipt: Receipt) => void = () => {
      throw new Error('Not started')
    }
    deps.prepare.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10_000)),
    )
    deps.dispatch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(eventReceipt()), 30_000),
          ),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishLate = resolve
          }),
      )
    const running = execute()
    await vi.advanceTimersByTimeAsync(40_000)
    expect(run.operations.map((o) => o.status)).toEqual([
      'succeeded',
      'running',
      'pending',
    ])
    await vi.advanceTimersByTimeAsync(20_000)
    await running
    expect(run.status).toBe('timed-out')
    expect(run.operations.map((o) => o.status)).toEqual([
      'succeeded',
      'timed-out',
      'skipped',
    ])
    expect(deps.dispatch.mock.calls[1][2].aborted).toBe(true)
    const stopped = structuredClone(run)
    const notifications = deps.changed.mock.calls.length
    finishLate(eventReceipt(99))
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toEqual(stopped)
    expect(deps.changed).toHaveBeenCalledTimes(notifications)
    await execute()
    expect(deps.dispatch).toHaveBeenCalledTimes(2)
  })
  it('times out before a mutation when preflight hangs', async () => {
    vi.useFakeTimers()
    const { execute, deps, run } = runnerFixture()
    deps.prepare.mockImplementation(() => new Promise(() => {}))
    const running = execute()
    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS)
    await running
    expect(run.status).toBe('timed-out')
    expect(run.operations.map((o) => o.status)).toEqual(['skipped', 'skipped'])
    expect(deps.dispatch).not.toHaveBeenCalled()
  })
  it('cancels during preflight and ignores its late result', async () => {
    vi.useFakeTimers()
    const { execute, deps, run, controller } = runnerFixture()
    let finishPreflight!: () => void
    deps.prepare.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishPreflight = resolve
        }),
    )
    const running = execute()
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await running
    expect(run.status).toBe('cancelled')
    expect(run.operations.map((o) => o.status)).toEqual(['skipped', 'skipped'])
    finishPreflight()
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.dispatch).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each(['resolve', 'reject'])(
    'cancels in flight and ignores a late %s',
    async (outcome) => {
      vi.useFakeTimers()
      const a = action()
      a.actions.push(tag('unsent'))
      const { execute, deps, run, controller } = runnerFixture(a)
      let finishLate!: () => void
      deps.dispatch
        .mockResolvedValueOnce(eventReceipt())
        .mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              finishLate = () =>
                outcome === 'resolve'
                  ? resolve(eventReceipt(99))
                  : reject(new Error('Late failure'))
            }),
        )
      const running = execute()
      await vi.advanceTimersByTimeAsync(0)
      controller.abort()
      await running
      expect(run.status).toBe('cancelled')
      expect(run.operations.map((o) => o.status)).toEqual([
        'succeeded',
        'cancelled',
        'skipped',
      ])
      expect(run.operations[0].receipt).toEqual(eventReceipt())
      const stopped = structuredClone(run)
      finishLate()
      await vi.advanceTimersByTimeAsync(0)
      expect(run).toEqual(stopped)
      await execute()
      expect(deps.dispatch).toHaveBeenCalledTimes(2)
      expect(vi.getTimerCount()).toBe(0)
    },
  )
  it('cleans up the timeout after successful execution', async () => {
    vi.useFakeTimers()
    const { execute, run } = runnerFixture()
    await execute()
    expect(run.status).toBe('succeeded')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('freezes the definition and targets and assigns independent batch IDs', () => {
    const state = snapshot()
    state.context.report = null
    const a = action()
    a.helpText = 'Review\n<b>literally</b>'
    const run = createRun(a, state)
    const another = createRun(a, state)
    a.helpText = 'Changed'
    a.actions = []
    state.context.subject = accountRef('did:plc:other')
    expect(run.context.report).toBeNull()
    expect(run.context.subject).toEqual(accountRef(did))
    expect(run.action.helpText).toBe('Review\n<b>literally</b>')
    expect(run.operations).toHaveLength(2)
    expect(run.batchId).not.toBe(another.batchId)
  })
  it('sanitizes arbitrary transport errors in progress', async () => {
    const { execute, deps, run } = runnerFixture()
    deps.dispatch.mockRejectedValue({
      status: 500,
      message: 'Authorization: Bearer secret',
      headers: { cookie: 'secret' },
    })
    await execute()
    expect(JSON.stringify(run)).not.toContain('secret')
  })
})

describe('API receipts', () => {
  it('passes runner metadata and the abort signal and returns the event ID', async () => {
    const { run } = runnerFixture()
    const signal = new AbortController().signal
    const emitEvent = vi.fn().mockResolvedValue({ data: { id: 19 } })
    const receipt = await dispatch(
      agentWith({ moderation: { emitEvent } }),
      run,
      run.operations[0],
      signal,
    )
    expect(receipt).toEqual(eventReceipt(19))
    expect(emitEvent.mock.calls[0][0].modTool).toEqual(
      eventMetadata(run, run.operations[0]),
    )
    expect(emitEvent.mock.calls[0][1].signal).toBe(signal)
  })
  it('does not send an operation after the signal has expired', async () => {
    const { run } = runnerFixture()
    const controller = new AbortController()
    controller.abort()
    const emitEvent = vi.fn()
    await expect(
      dispatch(
        agentWith({ moderation: { emitEvent } }),
        run,
        run.operations[0],
        controller.signal,
      ),
    ).rejects.toThrow()
    expect(emitEvent).not.toHaveBeenCalled()
  })
  it('retains report activity receipts and passes the abort signal', async () => {
    const a = action()
    a.actions = [
      {
        id: 'close',
        type: 'activity',
        target: 'report',
        activity: { $type: 'tools.ozone.report.defs#closeActivity' },
        internalNote: 'Reviewed',
      },
    ]
    const run = createRun(a, snapshot())
    const signal = new AbortController().signal
    const createActivity = vi.fn().mockResolvedValue({
      data: {
        activity: {
          id: 33,
          reportId: 123,
          activity: {
            $type: 'tools.ozone.report.defs#closeActivity',
            previousStatus: 'open',
          },
          internalNote: 'Reviewed',
          createdBy: moderator,
          createdAt: new Date().toISOString(),
        },
      },
    })
    const receipt = await dispatch(
      agentWith({ report: { createActivity } }),
      run,
      run.operations[0],
      signal,
    )
    expect(receipt).toMatchObject({
      kind: 'report-activity',
      activityId: 33,
      reportId: 123,
      previousStatus: 'open',
      internalNote: 'Reviewed',
    })
    expect(createActivity.mock.calls[0][0]).toMatchObject({
      reportId: 123,
      isAutomated: false,
    })
    expect(createActivity.mock.calls[0][1].signal).toBe(signal)
  })
  it('rejects empty verification grants and mismatched existing profiles', async () => {
    const a = action()
    a.actions = [{ id: 'verify', type: 'verify', target: 'account' }]
    const run = createRun(a, snapshot())
    const grantVerifications = vi.fn().mockResolvedValue({
      data: { verifications: [], failedVerifications: [] },
    })
    const agent = agentWith({
      verification: {
        grantVerifications,
        listVerifications: vi.fn().mockResolvedValue({
          data: {
            verifications: [
              {
                issuer,
                subject: did,
                handle: 'old.test',
                displayName: 'Example',
                uri: `at://${issuer}/app.bsky.graph.verification/a`,
              },
            ],
          },
        }),
      },
    })
    const signal = new AbortController().signal
    await expect(
      dispatch(agent, run, run.operations[0], signal),
    ).rejects.toThrow('Empty')
    expect(grantVerifications.mock.calls[0][1].signal).toBe(signal)
  })
  it('reuses an existing verification without granting again', async () => {
    const a = action()
    a.actions = [{ id: 'verify', type: 'verify', target: 'account' }]
    const run = createRun(a, snapshot())
    const grantVerifications = vi.fn()
    const listVerifications = vi.fn().mockResolvedValue({
      data: {
        verifications: [
          {
            issuer,
            subject: did,
            handle: 'example.test',
            displayName: 'Example',
            uri: `at://${issuer}/app.bsky.graph.verification/abc`,
          },
        ],
      },
    })
    const receipt = await dispatch(
      agentWith({ verification: { listVerifications, grantVerifications } }),
      run,
      run.operations[0],
    )
    expect(receipt).toMatchObject({
      kind: 'verification',
      uri: `at://${issuer}/app.bsky.graph.verification/abc`,
    })
    expect(grantVerifications).not.toHaveBeenCalled()
  })
  it('does not grant verification if its lookup finishes after cancellation', async () => {
    const a = action()
    a.actions = [{ id: 'verify', type: 'verify', target: 'account' }]
    const run = createRun(a, snapshot())
    let finishLookup!: (value: unknown) => void
    const listVerifications = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLookup = resolve
        }),
    )
    const grantVerifications = vi.fn()
    const controller = new AbortController()
    const request = dispatch(
      agentWith({ verification: { listVerifications, grantVerifications } }),
      run,
      run.operations[0],
      controller.signal,
    )
    controller.abort()
    finishLookup({ data: { verifications: [] } })
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(grantVerifications).not.toHaveBeenCalled()
  })
  it('checks DM permissions without requiring a current restriction for native tag events', () => {
    const a = action()
    a.actions = [
      {
        id: 'dm',
        type: 'event',
        target: 'account',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventTag',
          add: [],
          remove: ['chat-disabled'],
        },
      },
    ]
    const state = snapshot()
    expect(prepare(a, state)).toHaveLength(1)
    state.config.permissions.canManageChat = false
    expect(() => prepare(a, state)).toThrow('chat permission')
    state.config.permissions.canManageChat = true
    expect(prepare(a, state)).toHaveLength(1)
  })
})
