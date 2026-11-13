import type { Agent } from '@atproto/api'
import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef, prepare, prepareConfirmed, readSnapshot } from './compile'
import { conditionError } from './conditions'
import { createRun, executeRun } from './execution'
import type { Condition, CustomAction, Snapshot } from './types'
import { ADMIN_ROLE, validateSettings } from './validation'

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const labeler = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'
const moderator = 'did:plc:cccccccccccccccccccccccc'
const spamCondition: Condition[] = [
  { target: 'account', requiredLabels: ['spam'] },
]

beforeEach(() => vi.stubGlobal('crypto', webcrypto))

function snapshot(): Snapshot {
  return {
    context: {
      serviceDid: labeler,
      uiOrigin: 'https://ozone.example',
      subject: accountRef(did),
      owningAccountDid: did,
      moderator: { did: moderator },
      confirmedInputs: {},
      report: { id: 1, queueId: 7, url: 'https://ozone.example/reports/1' },
    },
    config: parseServerConfig({ viewer: { role: ADMIN_ROLE } }),
    protectedTags: {},
    policies: {},
    subjectTags: [],
    accountTags: ['needs-review'],
    subjectLabels: [],
    accountLabels: ['needs-review', 'spam'],
    subjectAppealed: true,
    accountAppealed: true,
  }
}

function workflow(): CustomAction {
  return {
    id: 'review-account',
    name: 'Review account',
    allowedRoles: [ADMIN_ROLE],
    subjectTypes: ['account'],
    actions: [
      {
        id: 'clear-review-label',
        type: 'event',
        target: 'account',
        when: [{ target: 'account', requiredLabels: ['needs-review'] }],
        continueOnError: true,
        event: {
          $type: 'tools.ozone.moderation.defs#modEventLabel',
          createLabelVals: [],
          negateLabelVals: ['needs-review'],
        },
      },
      {
        id: 'clear-review-tag',
        type: 'event',
        target: 'account',
        when: [{ target: 'account', requiredTags: ['needs-review'] }],
        continueOnError: true,
        event: {
          $type: 'tools.ozone.moderation.defs#modEventTag',
          add: [],
          remove: ['needs-review'],
        },
      },
      {
        id: 'remove-spam',
        type: 'event',
        target: 'account',
        when: spamCondition,
        event: {
          $type: 'tools.ozone.moderation.defs#modEventLabel',
          createLabelVals: [],
          negateLabelVals: ['spam'],
        },
        reportAction: { scope: 'current' },
      },
      {
        id: 'resolve-appeal',
        type: 'event',
        target: 'account',
        when: [{ target: 'account', appealed: true }],
        event: {
          $type: 'tools.ozone.moderation.defs#modEventResolveAppeal',
          comment: 'Account reviewed.',
        },
      },
    ],
  }
}

describe('conditional steps', () => {
  it('validates step conditions and allows complementary branches', () => {
    const action = workflow()
    action.actions.push({
      id: 'no-spam',
      type: 'event',
      target: 'account',
      when: [{ target: 'account', absentLabels: ['spam'] }],
      event: {
        $type: 'tools.ozone.moderation.defs#modEventComment',
        comment: 'No spam label.',
      },
    })
    expect(() =>
      validateSettings({ version: 1, customActions: [action] }),
    ).not.toThrow()
    for (const when of [
      [],
      [{ target: 'account' }],
      [{ target: 'account', requiredLabels: [] }],
      [{ target: 'account', appealed: 'true' }],
      [{ target: 'account', requiredLabels: ['spam'], absentLabels: ['spam'] }],
      [
        { target: 'account', appealed: true },
        { target: 'subject', appealed: false },
      ],
    ]) {
      Object.assign(action.actions[0], { when })
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow()
    }
  })
  it('links spam removal to the current report and resolves the subject separately', () => {
    const operations = prepare(workflow(), snapshot())
    expect(operations.map((op) => op.status)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
    ])
    expect(operations[2].request.body).toMatchObject({
      reportAction: { ids: [1] },
      event: { negateLabelVals: ['spam'] },
    })
    expect(operations[3].request.body).not.toHaveProperty('reportAction')
    expect(operations[2].continueOnError).toBeUndefined()
  })
  it('skips absent flags without dispatching cleanup requests', async () => {
    const state = snapshot()
    state.accountLabels = []
    state.accountTags = []
    const run = createRun(workflow(), state)
    expect(run.operations.map((op) => op.status)).toEqual([
      'skipped',
      'skipped',
      'skipped',
      'pending',
    ])
    const dispatch = vi
      .fn()
      .mockResolvedValue({
        kind: 'moderation-event',
        eventId: 10,
        url: 'https://ozone.example/events/10',
      })
    await executeRun(
      run,
      { prepare: async () => {}, dispatch, changed: () => {} },
      new AbortController(),
    )
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0][1].stepId).toBe('resolve-appeal')
    expect(run.operations[2].skipReason).toContain(
      'Missing labels on account: spam',
    )
    expect(run.status).toBe('succeeded')
  })
  it('does not require permissions for an event whose conditions do not match', () => {
    const state = snapshot()
    state.accountLabels = []
    state.accountAppealed = false
    state.config.permissions.canLabel = false
    expect(prepare(workflow(), state)[0].status).toBe('skipped')
    state.accountLabels = ['needs-review']
    expect(() => prepare(workflow(), state)).toThrow('Label permission')
  })
  it('stops before writes if refreshed state chooses a different branch', async () => {
    const confirmed = snapshot()
    const fresh = snapshot()
    fresh.accountLabels = []
    const run = createRun(workflow(), confirmed)
    const dispatch = vi.fn()
    await executeRun(
      run,
      {
        prepare: async () => {
          run.operations = prepareConfirmed(workflow(), confirmed, fresh)
        },
        dispatch,
        changed: () => {},
      },
      new AbortController(),
    )
    expect(run.status).toBe('failed')
    expect(run.error).toContain('confirm again')
    expect(dispatch).not.toHaveBeenCalled()
    expect(prepareConfirmed(workflow(), confirmed, confirmed)).toEqual(
      prepare(workflow(), confirmed),
    )
  })
  it('checks account conditions independently of record conditions', () => {
    const state = snapshot()
    state.subjectLabels = ['other']
    expect(conditionError(spamCondition, state)).toBeUndefined()
    expect(
      conditionError([{ target: 'subject', requiredLabels: ['spam'] }], state),
    ).toContain('Missing labels on subject')
    expect(
      conditionError([{ target: 'account', absentLabels: ['spam'] }], state),
    ).toContain('Present labels on account')
  })
})
