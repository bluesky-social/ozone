import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomAction, Run, Snapshot } from './types'
import { CustomActionPanel, useCustomActionPanel } from './Panel'
import { parseServerConfig } from '../../lib/server-config'
import { accountRef } from './compile'

const state = vi.hoisted(() => ({
  moderatorDid: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb' as string | undefined,
  role: 'tools.ozone.team.defs#roleAdmin',
  queueId: 7 as number | undefined,
  error: false,
  actions: [] as CustomAction[],
  queryKey: [] as unknown[],
  run: null as Run | null,
  snapshot: null as Snapshot | null,
}))

vi.mock('../shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({
    config: { did: 'did:plc:service' },
    labelerAgent: { did: state.moderatorDid },
    serverConfig: { role: state.role },
  }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: unknown[] }) => {
    state.queryKey = options.queryKey
    return {
      data:
        state.snapshot ||
        (state.queueId === undefined
          ? undefined
          : {
              context: { report: { id: 123, queueId: state.queueId } },
            }),
      isError: state.error,
    }
  },
}))
vi.mock('./useSettings', () => ({
  useCustomActionSettings: () => ({ actions: state.actions, dataUpdatedAt: 1 }),
}))
vi.mock('./useRun', () => ({
  useCustomActionRun: () => ({ run: state.run, dismiss: vi.fn() }),
}))
vi.mock('@/common/buttons', () => ({ ActionButton: () => null }))
vi.mock('@/common/labels/List', () => ({
  LabelList: () => null,
  ModerationLabel: () => null,
}))
vi.mock('../tags/SubjectTag', () => ({ SubjectTag: () => null }))

function choices(report?: Parameters<typeof useCustomActionPanel>[1]) {
  let model!: ReturnType<typeof useCustomActionPanel>
  function Harness() {
    model = useCustomActionPanel('did:plc:aaaaaaaaaaaaaaaaaaaaaaaa', report)
    return null
  }
  renderToStaticMarkup(<Harness />)
  return model.choices.map((action) => action.id)
}

beforeEach(() => {
  state.moderatorDid = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb'
  state.role = 'tools.ozone.team.defs#roleAdmin'
  state.queueId = 7
  state.error = false
  state.run = null
  state.snapshot = null
  const workflow: CustomAction = {
    id: 'unscoped',
    name: 'Unscoped',
    allowedRoles: [state.role],
    subjectTypes: ['account'],
    actions: [
      {
        id: 'comment',
        type: 'event',
        target: 'subject',
        event: {
          $type: 'tools.ozone.moderation.defs#modEventComment',
          comment: 'Reviewed',
        },
      },
    ],
  }
  state.actions = [
    workflow,
    { ...workflow, id: 'queue', queueIds: [7] },
    { ...workflow, id: 'unassigned', queueIds: [-1] },
    {
      ...workflow,
      id: 'moderator',
      allowedModeratorDids: [state.moderatorDid],
    },
    {
      ...workflow,
      id: 'both',
      queueIds: [7],
      allowedModeratorDids: [state.moderatorDid],
    },
  ].map((action) => ({ ...action, name: action.id }))
})

describe('custom action progress', () => {
  it('previews the applicable branch and the reason each absent flag is skipped', () => {
    const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
    state.actions = [
      {
        ...state.actions[0],
        actions: [
          {
            id: 'remove-spam',
            type: 'event',
            target: 'account',
            when: [{ target: 'account', requiredLabels: ['spam'] }],
            event: {
              $type: 'tools.ozone.moderation.defs#modEventLabel',
              createLabelVals: [],
              negateLabelVals: ['spam'],
            },
          },
          {
            id: 'resolve',
            type: 'event',
            target: 'account',
            when: [{ target: 'account', absentLabels: ['spam'] }],
            event: {
              $type: 'tools.ozone.moderation.defs#modEventResolveAppeal',
            },
          },
          {
            id: 'close-appeals',
            type: 'closeReports',
            target: 'account',
            reportTypes: ['tools.ozone.report.defs#reasonAppeal'],
            when: [{ target: 'account', absentLabels: ['spam'] }],
            internalNote: 'Account reviewed.',
          },
        ],
      },
    ]
    state.snapshot = {
      context: {
        subject: accountRef(did),
        owningAccountDid: did,
        serviceDid: 'did:plc:service',
        uiOrigin: 'https://ozone.example',
        moderator: { did: state.moderatorDid! },
        report: null,
        confirmedInputs: {},
      },
      config: parseServerConfig({
        viewer: { role: 'tools.ozone.team.defs#roleAdmin' },
      }),
      protectedTags: {},
      policies: {},
      subjectTags: [],
      accountTags: [],
      subjectLabels: [],
      accountLabels: [],
      subjectAppealed: true,
      accountAppealed: true,
    }
    function Harness() {
      const model = useCustomActionPanel(did)
      return (
        <CustomActionPanel model={{ ...model, selected: state.actions[0] }} />
      )
    }
    let html = renderToStaticMarkup(<Harness />)
    expect(html).toContain('Will skip')
    expect(html).toContain('Missing labels on account: spam')
    expect(html).toContain('Resolve subject appeal')
    expect(html).toContain('Will run')
    expect(html).toContain('Close eligible matching reports as no-action')
    expect(html).toContain('appeal reports will be denied')
    expect(html).toContain('actively assigned reports stay open')
    expect(html).toContain('Account reviewed.')
    state.snapshot.accountLabels = ['spam']
    html = renderToStaticMarkup(<Harness />)
    expect(html).not.toContain('Missing labels on account: spam')
    expect(html).toContain('Present labels on account: spam')
  })

  it.each([
    ['succeeded', 'Custom action completed.'],
    ['completed-with-errors', 'Custom action completed with errors.'],
    ['failed', 'Custom action stopped after an error.'],
  ] as const)(
    'shows %s with truthful per-step status and receipts',
    (status, message) => {
      const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
      const subject = { $type: 'com.atproto.admin.defs#repoRef' as const, did }
      const action: CustomAction = {
        ...state.actions[0],
        actions: [
          {
            id: 'optional',
            type: 'event',
            target: 'subject',
            continueOnError: true,
            event: {
              $type: 'tools.ozone.moderation.defs#modEventTag',
              add: [],
              remove: ['review:example'],
            },
          },
          state.actions[0].actions[0],
        ],
      }
      state.run = {
        id: 'run',
        batchId: 'batch',
        startedAt: '',
        updatedAt: '',
        action,
        status,
        ...(status === 'failed' && { error: 'Required change failed' }),
        context: {
          serviceDid: 'did:plc:service',
          uiOrigin: 'https://ozone.example',
          subject,
          owningAccountDid: did,
          moderator: { did: state.moderatorDid! },
          confirmedInputs: {},
          report: {
            id: 123,
            queueId: 7,
            url: 'https://ozone.example/reports/123',
          },
        },
        operations: action.actions.map((step, index) => ({
          id: step.id,
          stepId: step.id,
          target: step.target,
          subject,
          request: {
            endpoint: 'tools.ozone.moderation.emitEvent',
            body: {
              subject,
              createdBy: state.moderatorDid!,
              event: { $type: 'tools.ozone.moderation.defs#modEventComment' },
            },
          },
          status:
            index === 0 && status !== 'succeeded'
              ? 'failed'
              : status === 'failed'
                ? 'skipped'
                : 'succeeded',
          ...(index === 1 &&
            status !== 'failed' && {
              receipt: {
                kind: 'moderation-event',
                eventId: 42,
                url: 'https://ozone.example/events/42',
              },
            }),
        })),
      }
      function Harness() {
        return (
          <CustomActionPanel model={useCustomActionPanel(did, { id: 123 })} />
        )
      }
      const html = renderToStaticMarkup(<Harness />)
      expect(html).toContain(message)
      if (status === 'failed') {
        expect(html).toContain('<p role="alert">Required change failed</p>')
      } else {
        expect(html).not.toContain('Required change failed')
      }
      expect(html).toContain('Continue to the next step if this change fails')
      if (status === 'completed-with-errors') {
        expect(html).toContain('>failed</p>')
        expect(html).toContain('href="https://ozone.example/events/42"')
        expect(html).toContain('Completed steps were kept.')
        expect(html).not.toContain('Remaining steps were skipped.')
      }
    },
  )
})

describe('custom action menu scoping', () => {
  it('hides actions whose action-level tag conditions are unmet or not loaded', () => {
    const action = state.actions[0]
    action.when = [{ target: 'account', requiredTags: ['chat-disabled'] }]
    state.actions = [action]
    state.queueId = undefined
    expect(choices()).toEqual([])
    const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
    state.snapshot = {
      context: {
        subject: accountRef(did),
        owningAccountDid: did,
        serviceDid: 'did:plc:service',
        uiOrigin: 'https://ozone.example',
        moderator: { did: state.moderatorDid! },
        report: null,
        confirmedInputs: {},
      },
      config: parseServerConfig({
        viewer: { role: 'tools.ozone.team.defs#roleAdmin' },
      }),
      protectedTags: {},
      policies: {},
      subjectTags: [],
      accountTags: [],
      subjectLabels: [],
      accountLabels: [],
      subjectAppealed: false,
      accountAppealed: false,
    }
    expect(choices()).toEqual([])
    state.snapshot.accountTags = ['chat-disabled']
    expect(choices()).toEqual(['unscoped'])
    state.error = true
    expect(choices()).toEqual([])
  })

  it('applies both restrictions and updates when queue or moderator changes', () => {
    expect(choices({ id: 123 })).toEqual([
      'unscoped',
      'queue',
      'moderator',
      'both',
    ])
    state.queueId = 8
    expect(choices({ id: 123 })).toEqual(['unscoped', 'moderator'])
    state.queueId = 7
    state.moderatorDid = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
    expect(choices({ id: 123 })).toEqual(['unscoped', 'queue'])
    state.moderatorDid = undefined
    expect(choices({ id: 123 })).toEqual(['unscoped', 'queue'])
  })
  it('hides queue-scoped actions while report context is loading or failed', () => {
    state.queueId = undefined
    expect(choices({ id: 123 })).toEqual(['unscoped', 'moderator'])
    state.queueId = 7
    state.error = true
    expect(choices({ id: 123 })).toEqual(['unscoped', 'moderator'])
  })
  it('distinguishes an unassigned report from missing context', () => {
    state.queueId = -1
    expect(choices({ id: 123 })).toEqual([
      'unscoped',
      'unassigned',
      'moderator',
    ])
    state.queueId = undefined
    expect(choices()).toEqual(['unscoped', 'moderator'])
    state.queueId = 7
    expect(choices()).toEqual(['unscoped', 'moderator'])
  })
  it('does not let a matching moderator bypass the role allowlist', () => {
    state.role = 'tools.ozone.team.defs#roleTriage'
    expect(choices({ id: 123 })).toEqual([])
  })
  it('changes the snapshot query key when the same report moves queues', () => {
    choices({ id: 123 })
    const before = state.queryKey
    const report = { id: 123, queue: { id: 8 } } as Parameters<
      typeof useCustomActionPanel
    >[1]
    choices(report)
    expect(state.queryKey).not.toEqual(before)
  })
})
