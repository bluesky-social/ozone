import type { Agent } from '@atproto/api'
import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef, prepare, prepareConfirmed } from './compile'
import { createRun, dispatch, executeRun } from './execution'
import type { CustomAction, Snapshot, Step } from './types'
import { ADMIN_ROLE, validateSettings } from './validation'

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const appeal = 'tools.ozone.report.defs#reasonAppeal'
const closure: Step = {
  id: 'close-appeals',
  type: 'closeReports',
  target: 'account',
  reportTypes: [appeal],
  when: [{ target: 'account', absentLabels: ['spam'] }],
  internalNote: 'Account reviewed.',
}
function fixture() {
  const action: CustomAction = {
    id: 'resolve-appeals',
    name: 'Resolve appeals',
    allowedRoles: [ADMIN_ROLE],
    subjectTypes: ['account', 'record'],
    actions: [
      {
        id: 'resolve',
        type: 'event',
        target: 'account',
        event: { $type: 'tools.ozone.moderation.defs#modEventResolveAppeal' },
      },
      structuredClone(closure),
    ],
  }
  const state: Snapshot = {
    context: {
      serviceDid: did,
      uiOrigin: 'https://ozone.example',
      subject: {
        $type: 'com.atproto.repo.strongRef',
        uri: `at://${did}/app.bsky.feed.post/example`,
        cid: 'bafyexample',
      },
      owningAccountDid: did,
      moderator: { did },
      report: null,
      confirmedInputs: {},
    },
    config: parseServerConfig({ viewer: { role: ADMIN_ROLE } }),
    protectedTags: {},
    policies: {},
    subjectTags: [],
    accountTags: [],
    subjectLabels: [],
    accountLabels: [],
    subjectAppealed: false,
    accountAppealed: true,
  }
  const emitEvent = vi.fn().mockResolvedValue({ data: { id: 10 } })
  const closeReports = vi
    .fn()
    .mockResolvedValue({ data: { closedCount: 2, reportIds: [3, 4] } })
  const agent = {
    tools: { ozone: { moderation: { emitEvent }, report: { closeReports } } },
  } as unknown as Agent
  const run = createRun(action, state)
  const execute = () =>
    executeRun(
      run,
      {
        prepare: async () => {},
        dispatch: (run, op, signal) => dispatch(agent, run, op, signal),
        changed: () => {},
      },
      new AbortController(),
    )
  return { action, state, agent, run, emitEvent, closeReports, execute }
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto))

describe('bulk no-action custom-action steps', () => {
  it('targets only owning-account appeal reports and retains closure receipts and metadata', async () => {
    const { run, closeReports, execute } = fixture()
    await execute()
    expect(run.status).toBe('succeeded')
    expect(closeReports).toHaveBeenCalledWith(
      {
        subject: did,
        reportTypes: [appeal],
        internalNote: 'Account reviewed.',
        isAutomated: false,
        meta: {
          batchId: run.batchId,
          workflowId: run.action.id,
          stepId: 'close-appeals',
          operationId: 'close-appeals',
          source: `ozone-ui/custom-action/${run.action.id}`,
        },
      },
      { signal: expect.any(AbortSignal) },
    )
    expect(run.operations[1].receipt).toEqual({
      kind: 'report-closure',
      closedCount: 2,
      reportIds: [3, 4],
    })
    expect(run.operations[1].subject).toEqual(accountRef(did))
  })
  it('supports exact-subject targeting without expanding to its account', () => {
    const { action, state } = fixture()
    action.actions[1].target = 'subject'
    expect(prepare(action, state)[1].request.body).toMatchObject({
      subject: 'uri' in state.context.subject && state.context.subject.uri,
    })
  })
  it('skips a closure when conditions do not match and reconfirms changed branches', async () => {
    const { action, state } = fixture()
    const fresh = structuredClone(state)
    fresh.accountLabels = ['spam']
    expect(prepare(action, fresh)[1].status).toBe('skipped')
    expect(() => prepareConfirmed(action, state, fresh)).toThrow(
      'confirm again',
    )
    const run = createRun(action, fresh)
    const send = vi
      .fn()
      .mockResolvedValue({ kind: 'moderation-event', eventId: 10, url: '' })
    await executeRun(
      run,
      { prepare: async () => {}, dispatch: send, changed: () => {} },
      new AbortController(),
    )
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('requires moderator permission only for selected closure steps', () => {
    const { action, state } = fixture()
    action.actions = [structuredClone(closure)]
    state.config.permissions.canLabel = false
    expect(() => prepare(action, state)).toThrow('Moderator permission')
    state.accountLabels = ['spam']
    expect(prepare(action, state)[0].status).toBe('skipped')
  })
  it.each([undefined, [], [appeal, appeal]])(
    'rejects missing, empty, and duplicate reason filters: %j',
    (reportTypes) => {
      const { action } = fixture()
      Object.assign(action.actions[1], { reportTypes })
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow()
    },
  )
  it.each(['continueOnError', 'actionEventId', 'includeAllOwned'])(
    'rejects unsupported closure option %s',
    (key) => {
      const { action } = fixture()
      Object.assign(action.actions[1], { [key]: true })
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow()
    },
  )
  it('treats zero eligible reports as successful', async () => {
    const { closeReports, run, execute } = fixture()
    closeReports.mockResolvedValue({ data: { closedCount: 0, reportIds: [] } })
    await execute()
    expect(run.status).toBe('succeeded')
    expect(run.operations[1].receipt).toEqual({
      kind: 'report-closure',
      closedCount: 0,
      reportIds: [],
    })
  })
  it.each([
    { closedCount: -1, reportIds: [] },
    { closedCount: 1, reportIds: [] },
    { closedCount: 2, reportIds: [3, 3] },
    { closedCount: 1, reportIds: [0] },
    { closedCount: 1, reportIds: [1.5] },
    { closedCount: '1', reportIds: [3] },
    { closedCount: 1 },
  ])('rejects malformed closure receipts: %j', async (data) => {
    const { closeReports, run, execute } = fixture()
    closeReports.mockResolvedValue({ data })
    await execute()
    expect(run.status).toBe('failed')
    expect(run.error).toContain('Unexpected report closure response')
    expect(run.operations[1].receipt).toBeUndefined()
    expect(run.operations[0].receipt).toMatchObject({ eventId: 10 })
  })
  it.each(['rejected', 'missing receipt'])(
    'never closes reports after a required event is %s',
    async (failure) => {
      const { emitEvent, closeReports, run, execute } = fixture()
      if (failure === 'rejected')
        emitEvent.mockRejectedValue(new Error('Resolve failed'))
      else emitEvent.mockResolvedValue({ data: {} })
      await execute()
      expect(run.status).toBe('failed')
      expect(closeReports).not.toHaveBeenCalled()
      expect(run.operations[1].status).toBe('skipped')
    },
  )
  it('retains earlier event receipts when report closure fails', async () => {
    const { closeReports, run, execute } = fixture()
    closeReports.mockRejectedValue(new Error('Closure failed'))
    await execute()
    expect(run.status).toBe('failed')
    expect(run.error).toBe('Closure failed')
    expect(run.operations[0].receipt).toMatchObject({ eventId: 10 })
    expect(run.operations[1].receipt).toBeUndefined()
  })
})
