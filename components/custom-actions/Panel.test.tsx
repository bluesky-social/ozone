import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomAction, Run } from './types'
import { CustomActionPanel, useCustomActionPanel } from './Panel'

const state = vi.hoisted(() => ({
  moderatorDid: 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb' as string | undefined,
  role: 'tools.ozone.team.defs#roleAdmin',
  queueId: 7 as number | undefined,
  error: false,
  actions: [] as CustomAction[],
  queryKey: [] as unknown[],
  run: null as Run | null,
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
        state.queueId === undefined
          ? undefined
          : {
              context: { report: { id: 123, queueId: state.queueId } },
            },
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
  it('previews the owning account enforcement and the exact content report closure', () => {
    const did = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa'
    const workflow: CustomAction = {
      ...state.actions[0],
      subjectTypes: ['record'],
      actions: [
        {
          id: 'take-down-account',
          type: 'event',
          target: 'account',
          event: { $type: 'tools.ozone.moderation.defs#modEventTakedown' },
          reportAction: { scope: 'current' },
        },
      ],
    }
    function Harness() {
      const model = useCustomActionPanel(`at://${did}/app.bsky.feed.post/abc`, {
        id: 123,
      })
      return <CustomActionPanel model={{ ...model, selected: workflow }} />
    }
    const html = renderToStaticMarkup(<Harness />)
    expect(html).toContain(`Take down: owning account ${did}`)
    expect(html).toContain('PERMANENT • close report #123 as actioned')
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
