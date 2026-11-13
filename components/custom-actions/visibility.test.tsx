import type { Agent } from '@atproto/api'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef, prepare, readSnapshot } from './compile'
import { useCustomActionPanel } from './Panel'
import type { Condition, CustomAction, Snapshot } from './types'
import { ADMIN_ROLE, validateSettings } from './validation'

const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
const labeler = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'
const moderator = 'did:plc:cccccccccccccccccccccccc'
const uri = `at://${did}/app.bsky.feed.post/example`
const state = vi.hoisted(() => ({
  actions: [] as CustomAction[],
  snapshot: null as Snapshot | null,
  isError: false,
}))

vi.mock('../shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({
    config: { did: labeler },
    labelerAgent: { did: moderator },
    serverConfig: { role: ADMIN_ROLE },
  }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: state.snapshot, isError: state.isError }),
}))
vi.mock('./useSettings', () => ({
  useCustomActionSettings: () => ({ actions: state.actions, dataUpdatedAt: 1 }),
}))
vi.mock('./useRun', () => ({
  useCustomActionRun: () => ({ run: null, dismiss: vi.fn() }),
}))
vi.mock('@/common/buttons', () => ({ ActionButton: () => null }))
vi.mock('@/common/labels/List', () => ({
  LabelList: () => null,
  ModerationLabel: () => null,
}))
vi.mock('../tags/SubjectTag', () => ({ SubjectTag: () => null }))

function snapshot(): Snapshot {
  return {
    context: {
      serviceDid: labeler,
      uiOrigin: 'https://ozone.example',
      subject: { $type: 'com.atproto.repo.strongRef', uri, cid: 'bafycurrent' },
      owningAccountDid: did,
      moderator: { did: moderator },
      confirmedInputs: {},
      report: null,
    },
    config: parseServerConfig({ viewer: { role: ADMIN_ROLE } }),
    protectedTags: {},
    policies: {},
    subjectTags: [],
    accountTags: [],
    subjectLabels: [],
    accountLabels: [],
    subjectAppealed: false,
    accountAppealed: false,
  }
}

function menu() {
  let choices: string[] = []
  function Harness() {
    choices = useCustomActionPanel(uri).choices.map((action) => action.id)
    return null
  }
  renderToStaticMarkup(<Harness />)
  return choices
}

beforeEach(() => {
  state.isError = false
  state.snapshot = snapshot()
  state.actions = [
    {
      id: 'review',
      name: 'Review',
      allowedRoles: [ADMIN_ROLE],
      subjectTypes: ['account', 'record'],
      actions: [
        {
          id: 'note',
          type: 'event',
          target: 'subject',
          event: {
            $type: 'tools.ozone.moderation.defs#modEventComment',
            comment: 'Reviewed',
          },
        },
      ],
    },
  ]
})

describe('custom action visibility', () => {
  it.each([
    { target: 'subject', appealed: true },
    { target: 'subject', appealed: false },
    { target: 'account', appealed: true },
    { target: 'account', appealed: false },
  ] as const)(
    'requires appealed=$appealed on the $target before showing or running an action',
    ({ target, appealed }) => {
      const action = state.actions[0]
      action.when = [{ target, appealed }]
      const field = target === 'account' ? 'accountAppealed' : 'subjectAppealed'
      const other = target === 'account' ? 'subjectAppealed' : 'accountAppealed'
      state.snapshot![field] = !appealed
      state.snapshot![other] = appealed
      expect(menu()).toEqual([])
      expect(() => prepare(action, state.snapshot!)).toThrow('appeal')
      state.snapshot![field] = appealed
      state.snapshot![other] = !appealed
      expect(menu()).toEqual(['review'])
      expect(prepare(action, state.snapshot!)).toHaveLength(1)
      state.snapshot![field] = !appealed
      expect(() => prepare(action, state.snapshot!)).toThrow('appeal')
    },
  )

  it('accepts both appeal states and rejects malformed or contradictory conditions', () => {
    const action = state.actions[0]
    for (const appealed of [true, false]) {
      action.when = [{ target: 'account', appealed }]
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).not.toThrow()
    }
    for (const appealed of ['true', 1, null]) {
      Object.assign(action, { when: [{ target: 'account', appealed }] })
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow()
    }
    for (const target of ['account', 'subject'] as const) {
      action.subjectTypes = ['account']
      action.when = [
        { target: 'account', appealed: true },
        { target, appealed: false },
      ]
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow('Conflicting appeal')
    }
    action.subjectTypes = ['record']
    expect(() =>
      validateSettings({ version: 1, customActions: [action] }),
    ).not.toThrow()
  })

  it.each(['subject', 'account'] as const)(
    'checks required and absent tags and labels on the %s independently',
    (target) => {
      const other = target === 'account' ? 'subject' : 'account'
      for (const kind of ['Tags', 'Labels'] as const) {
        const field = `${target}${kind}` as const
        const otherField = `${other}${kind}` as const
        state.snapshot![otherField] = ['spam']
        state.actions[0].when = [{ target, [`required${kind}`]: ['spam'] }]
        expect(menu()).toEqual([])
        state.snapshot![field] = ['spam']
        expect(menu()).toEqual(['review'])
        state.actions[0].when = [{ target, [`absent${kind}`]: ['spam'] }]
        expect(menu()).toEqual([])
        state.snapshot![field] = []
        expect(menu()).toEqual(['review'])
        state.snapshot![otherField] = []
      }
    },
  )

  it('requires every condition and every required value, and rechecks before writes', () => {
    const action = state.actions[0]
    action.when = [
      { target: 'account', requiredLabels: ['spam', 'needs-review'] },
      { target: 'subject', requiredTags: ['needs-review'] },
    ]
    state.snapshot!.accountLabels = ['spam', 'needs-review']
    expect(menu()).toEqual([])
    state.snapshot!.subjectTags = ['needs-review']
    expect(menu()).toEqual(['review'])
    expect(prepare(action, state.snapshot!)).toHaveLength(1)
    state.snapshot!.accountLabels = ['spam']
    expect(menu()).toEqual([])
    expect(() => prepare(action, state.snapshot!)).toThrow('conditions')
  })

  it('hides conditional actions during loading and errors, even with cached data', () => {
    const action = state.actions[0]
    state.actions.push({ ...action, id: 'always', name: 'Always' })
    action.when = [{ target: 'account', absentLabels: ['spam'] }]
    expect(menu()).toEqual(['review', 'always'])
    state.isError = true
    expect(menu()).toEqual(['always'])
    state.snapshot = null
    state.isError = false
    expect(menu()).toEqual(['always'])
  })

  it('validates label conditions and rejects contradictory conditions on account subjects', () => {
    const action = state.actions[0]
    const valid: Condition[] = [{ target: 'account', requiredLabels: ['spam'] }]
    action.when = valid
    expect(() =>
      validateSettings({ version: 1, customActions: [action] }),
    ).not.toThrow()
    action.subjectTypes = ['account']
    for (const when of [
      [{ target: 'account', requiredLabels: [] }],
      [{ target: 'account', requiredLabels: ['spam', 'spam'] }],
      [{ target: 'account', requiredLabels: ['spam'], absentLabels: ['spam'] }],
      [
        { target: 'account', requiredLabels: ['spam'] },
        { target: 'subject', absentLabels: ['spam'] },
      ],
    ]) {
      Object.assign(action, { when })
      expect(() =>
        validateSettings({ version: 1, customActions: [action] }),
      ).toThrow()
    }
  })
})

describe('label snapshots', () => {
  it('uses active labels from this labeler on the exact subject and record version', async () => {
    const label = (val: string, overrides = {}) => ({
      src: labeler,
      uri: did,
      val,
      cts: '2026-01-01T00:00:00.000Z',
      ...overrides,
    })
    const agent = {
      did: moderator,
      tools: {
        ozone: {
          server: {
            getConfig: vi
              .fn()
              .mockResolvedValue({ data: { viewer: { role: ADMIN_ROLE } } }),
          },
          setting: {
            listOptions: vi.fn().mockResolvedValue({ data: { options: [] } }),
          },
          moderation: {
            getRepo: vi.fn().mockResolvedValue({
              data: {
                moderation: { subjectStatus: { appealed: true } },
                labels: [
                  label('spam'),
                  label('spam'),
                  label('negated', { neg: true }),
                  label('foreign', { src: moderator }),
                  label('wrong-subject', { uri }),
                  label('expired', { exp: '2000-01-01T00:00:00.000Z' }),
                  label('invalid-expiry', { exp: 'invalid' }),
                ],
              },
            }),
            getRecord: vi.fn().mockResolvedValue({
              data: {
                uri,
                cid: 'bafycurrent',
                moderation: {},
                labels: [
                  label('record-label', { uri, cid: 'bafycurrent' }),
                  label('old-version', { uri, cid: 'bafyold' }),
                  label('uncapped', { uri }),
                  label('foreign', { uri, src: moderator }),
                ],
              },
            }),
          },
        },
      },
    } as unknown as Agent
    const account = await readSnapshot(
      agent,
      `${labeler}#atproto_labeler`,
      'https://ozone.example',
      did,
    )
    expect(account.accountLabels).toEqual(['spam'])
    expect(account.subjectLabels).toEqual(['spam'])
    expect(account.accountAppealed).toBe(true)
    expect(account.subjectAppealed).toBe(true)
    expect(account.context.subject).toEqual(accountRef(did))
    const record = await readSnapshot(
      agent,
      labeler,
      'https://ozone.example',
      uri,
    )
    expect(record.accountLabels).toEqual(['spam'])
    expect(record.subjectLabels).toEqual(['record-label', 'uncapped'])
    expect(record.accountAppealed).toBe(true)
    expect(record.subjectAppealed).toBe(false)
  })
})
