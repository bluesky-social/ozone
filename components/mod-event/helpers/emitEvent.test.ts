import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type {
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneModerationEmitEvents,
  ToolsOzoneModerationScheduleAction,
} from '@atproto/api'
import { MOD_EVENTS } from '../constants'
import { getEventFromFormData, useActionSubjects } from './emitEvent'

type Event = ToolsOzoneModerationEmitEvent.InputSchema['event']

const mocks = vi.hoisted(() => ({
  emitEvents: vi.fn<
    (input: ToolsOzoneModerationEmitEvents.InputSchema) => Promise<{
      data: ToolsOzoneModerationEmitEvents.OutputSchema
    }>
  >(),
  emitEvent:
    vi.fn<
      (input: ToolsOzoneModerationEmitEvent.InputSchema) => Promise<unknown>
    >(),
  scheduleAction:
    vi.fn<
      (
        input: ToolsOzoneModerationScheduleAction.InputSchema,
      ) => Promise<{ data: ToolsOzoneModerationScheduleAction.OutputSchema }>
    >(),
  createSubject: vi.fn(),
  fetchQuery: vi.fn(),
  toastPromise: vi.fn(
    (
      promise: Promise<unknown>,
      _options: {
        success: { render: () => string }
      },
    ) => promise,
  ),
  toastError: vi.fn(),
}))

vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => ({
    assertDid: 'did:plc:moderator',
    tools: {
      ozone: {
        moderation: {
          emitEvent: mocks.emitEvent,
          emitEvents: mocks.emitEvents,
          scheduleAction: mocks.scheduleAction,
        },
      },
    },
  }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ fetchQuery: mocks.fetchQuery }),
}))
vi.mock('react-toastify', () => ({
  toast: { promise: mocks.toastPromise, error: mocks.toastError },
}))
vi.mock('@/reports/helpers/subject', () => ({
  useCreateSubjectFromId: () => mocks.createSubject,
  CollectionId: {
    Post: 'app.bsky.feed.post',
    Profile: 'app.bsky.actor.profile',
    List: 'app.bsky.graph.list',
  },
}))
vi.mock('@/lib/batchId', () => ({ getBatchId: () => 'example-batch' }))
vi.mock(
  '@/reports/modToolRegistry',
  () => import('../../reports/modToolRegistry'),
)
vi.mock('@/mod-event/constants', () => import('../constants'))
vi.mock('@/workspace/utils', () => import('../../workspace/utils'))
vi.mock('@/repositories/helpers', () => import('../../repositories/helpers'))
vi.mock('components/email/helpers', () => import('../../email/helpers'))
vi.mock('components/tags/utils', () => import('../../tags/utils'))
vi.mock('@/team/useOnlineModerators', () => ({
  useRefetchOnlineModerators: () => vi.fn(),
}))
vi.mock('@/setting/severity-level/useSeverityLevel', () => ({
  severityLevelQueryOptions: () => ({ queryKey: ['severity-level'] }),
}))

const account = 'did:plc:example'
const otherAccount = 'did:plc:other'
const record = `at://${account}/app.bsky.feed.post/example`
const recordRef = {
  $type: 'com.atproto.repo.strongRef',
  uri: record,
  cid: 'bafkreigs2iqxve4g42tt5hqkdjcwjxc3fkf5yty74kmx42yugozk4kx3ny',
}
const takedown: Event = {
  $type: MOD_EVENTS.TAKEDOWN,
  policies: ['example-policy'],
  durationInHours: 24,
  comment: 'Example review',
  acknowledgeAccountSubjects: true,
}
const tagging: Event = {
  $type: MOD_EVENTS.TAG,
  add: ['reviewed'],
  remove: [],
  comment: 'Example review',
}
const actionCases = [
  ['takedown', takedown],
  ['tagging', tagging],
] as const
const form = (values: Record<string, string>) => {
  const data = new FormData()
  Object.entries(values).forEach(([key, value]) => data.set(key, value))
  return data
}

function captureActionSubjects(options: { batchRequests?: boolean } = {}) {
  let action: ReturnType<typeof useActionSubjects> | undefined
  function Capture() {
    action = useActionSubjects()
    return null
  }
  renderToStaticMarkup(createElement(Capture))
  const invoke: ReturnType<typeof useActionSubjects> = (
    eventData,
    subjects,
    subjectData,
    actionOptions,
  ) =>
    action!(eventData, subjects, subjectData, { ...options, ...actionOptions })
  return invoke
}

const resolveSubject = async (id: string) => ({
  subject:
    id === record
      ? recordRef
      : { $type: 'com.atproto.admin.defs#repoRef', did: id },
})

const batchResponse = ({
  subjects,
  event,
  createdBy,
  modTool,
}: ToolsOzoneModerationEmitEvents.InputSchema) => ({
  data: {
    events: subjects.map(({ subject }, i) => ({
      id: i + 1,
      subject,
      event,
      createdBy,
      createdAt: '2026-01-01T00:00:00.000Z',
      subjectBlobCids: [],
      modTool,
    })),
    failedEvents: [],
  },
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  mocks.createSubject.mockImplementation(resolveSubject)
  mocks.emitEvent.mockResolvedValue({ data: {} })
  mocks.emitEvents.mockImplementation(async (input) => batchResponse(input))
  mocks.scheduleAction.mockImplementation(async ({ subjects }) => ({
    data: { succeeded: subjects, failed: [] },
  }))
  mocks.fetchQuery.mockResolvedValue({
    value: { 'sev-1': { name: 'Sev 1', expiryInDays: 30 } },
  })
  mocks.toastPromise.mockImplementation((promise) => promise)
})

afterEach(() => vi.useRealTimers())

describe('workspace bulk actions', () => {
  it.each(actionCases)(
    'does not submit %s with no selected subjects',
    async (_, event) => {
      expect(await captureActionSubjects()({ event }, [], {}, {})).toEqual({
        succeeded: [],
        failed: [],
      })
      expect(mocks.toastError).toHaveBeenCalledWith('No subject to action')
      expect(mocks.createSubject).not.toHaveBeenCalled()
      expect(mocks.emitEvent).not.toHaveBeenCalled()
      expect(mocks.scheduleAction).not.toHaveBeenCalled()
    },
  )

  it('preserves takedown form fields and prepares strikes for accounts and records', async () => {
    const event = getEventFromFormData(
      MOD_EVENTS.TAKEDOWN,
      form({
        policies: 'example-policy',
        durationInHours: '24',
        acknowledgeAccountSubjects: 'on',
        comment: 'Example review',
        severityLevel: 'Sev 1',
        strikeCount: '2',
        targetServices: 'appview,chat',
      }),
    )
    expect(
      await captureActionSubjects()(
        { event },
        [account, record],
        {},
        { externalUrl: 'https://example.test/review' },
      ),
    ).toEqual({ succeeded: [account, record], failed: [] })
    expect(mocks.emitEvent).toHaveBeenCalledTimes(2)
    for (const subject of [
      { $type: 'com.atproto.admin.defs#repoRef', did: account },
      recordRef,
    ]) {
      expect(mocks.emitEvent).toHaveBeenCalledWith({
        subject,
        createdBy: 'did:plc:moderator',
        event: {
          ...takedown,
          severityLevel: 'Sev 1',
          strikeCount: 2,
          targetServices: ['appview', 'chat'],
          strikeExpiresAt: '2026-01-31T00:00:00.000Z',
        },
        modTool: {
          name: 'ozone-ui/workspace',
          meta: {
            batchId: 'example-batch',
            batchSize: 2,
            externalUrl: 'https://example.test/review',
            strikeExpiryDays: 30,
          },
        },
      })
    }
    expect(event).not.toHaveProperty('strikeExpiresAt')
    expect(mocks.fetchQuery).toHaveBeenCalled()
    expect(mocks.scheduleAction).not.toHaveBeenCalled()
  })

  it.each([
    ['adds', ['reviewed', 'follow-up'], []],
    ['removes', [], ['reviewed', 'follow-up']],
  ])(
    '%s tags on every account and record without replacing the tag operation',
    async (_, add, remove) => {
      const event: Event = {
        $type: MOD_EVENTS.TAG,
        add,
        remove,
        comment: 'Example review',
      }
      expect(
        await captureActionSubjects()({ event }, [account, record], {}, {}),
      ).toEqual({ succeeded: [account, record], failed: [] })
      expect(mocks.emitEvent).toHaveBeenCalledTimes(2)
      expect(
        mocks.emitEvent.mock.calls.map(([input]) => input.subject),
      ).toEqual([
        { $type: 'com.atproto.admin.defs#repoRef', did: account },
        recordRef,
      ])
      for (const [input] of mocks.emitEvent.mock.calls) {
        expect(input.event).toEqual(event)
        expect(input.createdBy).toBe('did:plc:moderator')
      }
      expect(mocks.fetchQuery).not.toHaveBeenCalled()
      expect(mocks.scheduleAction).not.toHaveBeenCalled()
    },
  )

  it.each(actionCases)(
    'isolates subject-resolution and API failures during bulk %s',
    async (_, event) => {
      mocks.createSubject.mockImplementation(async (id) => {
        if (id === record) throw new Error('Record unavailable')
        return resolveSubject(id)
      })
      mocks.emitEvent.mockImplementation(async (input) => {
        if ('did' in input.subject && input.subject.did === otherAccount) {
          throw new Error('Request failed')
        }
        return { data: {} }
      })
      const laterSubjects = Array.from(
        { length: 48 },
        (_, i) => `did:plc:later${i}`,
      )
      const subjects = [account, record, otherAccount, ...laterSubjects]
      const action = captureActionSubjects()
      const result = await action({ event }, subjects, {}, {})
      expect(result.succeeded.toSorted()).toEqual(
        [account, ...laterSubjects].toSorted(),
      )
      expect(result.failed.toSorted()).toEqual(
        [record, otherAccount].toSorted(),
      )
      expect(mocks.emitEvent).toHaveBeenCalledTimes(50)
      expect(mocks.toastPromise.mock.calls[0][1].success.render()).toContain(
        'Actioned 48 Accounts. Failed to action 1 Account, 1 Post.',
      )

      mocks.createSubject.mockImplementation(resolveSubject)
      mocks.emitEvent.mockReset().mockResolvedValue({ data: {} })
      const retried = await action({ event }, result.failed, {}, {})
      expect(retried.succeeded.toSorted()).toEqual(
        [record, otherAccount].toSorted(),
      )
      expect(retried.failed).toEqual([])
      expect(mocks.emitEvent).toHaveBeenCalledTimes(2)
      expect(
        mocks.emitEvent.mock.calls.map(([input]) => input.subject),
      ).not.toContainEqual({
        $type: 'com.atproto.admin.defs#repoRef',
        did: account,
      })
    },
  )

  it.each(actionCases)(
    'retains all 301 subjects when pacing a large bulk %s',
    async (_, event) => {
      const subjects = Array.from(
        { length: 301 },
        (_, i) => `did:plc:example${i}`,
      )
      const pending = captureActionSubjects()({ event }, subjects, {}, {})
      await vi.advanceTimersByTimeAsync(0)
      expect(mocks.emitEvent).toHaveBeenCalledTimes(50)
      await vi.runAllTimersAsync()
      const result = await pending
      expect(result.failed).toEqual([])
      expect(result.succeeded.toSorted()).toEqual(subjects.toSorted())
      expect(mocks.emitEvent).toHaveBeenCalledTimes(301)
      expect(
        mocks.emitEvent.mock.calls.map(([input]) => input.subject),
      ).toEqual(
        subjects.map((did) => ({
          $type: 'com.atproto.admin.defs#repoRef',
          did,
        })),
      )
    },
  )

  it.each(actionCases)(
    'finishes the first batch before starting the next bulk %s batch',
    async (_, event) => {
      const subjects = Array.from(
        { length: 51 },
        (_, i) => `did:plc:example${i}`,
      )
      let release!: () => void
      const firstBatch = new Promise<void>((resolve) => {
        release = resolve
      })
      mocks.emitEvent.mockImplementation(async () => firstBatch)
      const pending = captureActionSubjects()({ event }, subjects, {}, {})
      await vi.advanceTimersByTimeAsync(0)
      expect(mocks.emitEvent).toHaveBeenCalledTimes(50)
      expect(mocks.createSubject).not.toHaveBeenCalledWith(subjects[50])
      release()
      const result = await pending
      expect(result.failed).toEqual([])
      expect(result.succeeded.toSorted()).toEqual(subjects.toSorted())
      expect(mocks.emitEvent).toHaveBeenCalledTimes(51)
      expect(
        mocks.emitEvent.mock.calls.map(([input]) => input.subject),
      ).toEqual(
        subjects.map((did) => ({
          $type: 'com.atproto.admin.defs#repoRef',
          did,
        })),
      )
      for (const [input] of mocks.emitEvent.mock.calls) {
        expect(input.event).toEqual(event)
        expect(input.modTool).toEqual({
          name: 'ozone-ui/workspace',
          meta: {
            batchId: 'example-batch',
            batchSize: 51,
            externalUrl: undefined,
          },
        })
      }
    },
  )

  it.each([
    ['exact execution time', { executeAt: '2026-02-01T00:00:00.000Z' }],
    [
      'randomized execution window',
      {
        executeAfter: '2026-02-01T00:00:00.000Z',
        executeUntil: '2026-02-01T08:00:00.000Z',
      },
    ],
  ] as const)(
    'schedules bulk takedowns with strike expiry based on the %s',
    async (_, scheduling) => {
      const event = { ...takedown, severityLevel: 'Sev 1', strikeCount: 2 }
      expect(
        await captureActionSubjects()(
          { event },
          [account, otherAccount],
          {},
          { scheduling },
        ),
      ).toEqual({ succeeded: [account, otherAccount], failed: [] })
      expect(mocks.scheduleAction).toHaveBeenCalledTimes(1)
      expect(mocks.scheduleAction).toHaveBeenCalledWith({
        subjects: [account, otherAccount],
        scheduling,
        createdBy: 'did:plc:moderator',
        action: {
          ...event,
          $type: 'tools.ozone.moderation.scheduleAction#takedown',
          strikeExpiresAt: '2026-03-03T00:00:00.000Z',
        },
        modTool: {
          name: 'ozone-ui/workspace',
          meta: {
            batchId: 'example-batch',
            batchSize: 2,
            externalUrl: undefined,
            strikeExpiryDays: 30,
          },
        },
      })
      expect(mocks.emitEvent).not.toHaveBeenCalled()
      expect(mocks.createSubject).not.toHaveBeenCalled()
      expect(event).not.toHaveProperty('strikeExpiresAt')
    },
  )

  it.each(['partial response', 'request rejection'])(
    'continues scheduling later batches after a %s',
    async (failure) => {
      const subjects = Array.from(
        { length: 51 },
        (_, i) => `did:plc:example${i}`,
      )
      if (failure === 'request rejection') {
        mocks.scheduleAction.mockRejectedValueOnce(new Error('Request failed'))
      } else {
        mocks.scheduleAction.mockResolvedValueOnce({
          data: {
            succeeded: subjects.slice(1, 50),
            failed: [{ subject: subjects[0], error: 'Unavailable' }],
          },
        })
      }
      const scheduling = { executeAt: '2026-02-01T00:00:00.000Z' }
      const result = await captureActionSubjects()(
        { event: takedown },
        subjects,
        {},
        { scheduling },
      )
      expect(result.failed).toEqual(
        failure === 'request rejection'
          ? subjects.slice(0, 50)
          : subjects.slice(0, 1),
      )
      expect(result.succeeded).toEqual(
        failure === 'request rejection'
          ? subjects.slice(50)
          : subjects.slice(1),
      )
      expect(
        mocks.scheduleAction.mock.calls.map(([input]) => input.subjects),
      ).toEqual([subjects.slice(0, 50), subjects.slice(50)])
      for (const [input] of mocks.scheduleAction.mock.calls) {
        expect(input.scheduling).toEqual(scheduling)
        expect(input.modTool?.meta).toMatchObject({
          batchId: 'example-batch',
          batchSize: 51,
        })
      }
      expect(mocks.emitEvent).not.toHaveBeenCalled()
    },
  )

  it('does not emit an unprepared strike when severity settings cannot load', async () => {
    mocks.fetchQuery.mockRejectedValue(new Error('Settings unavailable'))
    expect(
      await captureActionSubjects()(
        { event: { ...takedown, severityLevel: 'Sev 1', strikeCount: 2 } },
        [account, record],
        {},
        {},
      ),
    ).toEqual({ succeeded: [], failed: [account, record] })
    expect(mocks.emitEvent).not.toHaveBeenCalled()
  })
})

describe('opt-in batched workspace actions', () => {
  it('sends accounts and records together with prepared strikes and workspace metadata', async () => {
    const event = { ...takedown, severityLevel: 'Sev 1', strikeCount: 2 }
    expect(
      await captureActionSubjects({ batchRequests: true })(
        { event },
        [account, record],
        {},
        { externalUrl: 'https://example.test/review' },
      ),
    ).toEqual({ succeeded: [account, record], failed: [] })
    expect(mocks.emitEvents).toHaveBeenCalledOnce()
    expect(mocks.emitEvents).toHaveBeenCalledWith({
      event: { ...event, strikeExpiresAt: '2026-01-31T00:00:00.000Z' },
      subjects: [
        { subject: { $type: 'com.atproto.admin.defs#repoRef', did: account } },
        { subject: recordRef },
      ],
      createdBy: 'did:plc:moderator',
      modTool: {
        name: 'ozone-ui/workspace',
        meta: {
          batchId: 'example-batch',
          batchSize: 2,
          externalUrl: 'https://example.test/review',
          strikeExpiryDays: 30,
        },
      },
    })
    expect(mocks.emitEvent).not.toHaveBeenCalled()
    expect(event).not.toHaveProperty('strikeExpiresAt')
  })

  it('sends concurrent batches of at most 100 and removes duplicate targets', async () => {
    const subjects = Array.from(
      { length: 201 },
      (_, i) => `did:plc:example${i}`,
    )
    let release!: () => void
    const firstBatch = new Promise<void>((resolve) => {
      release = resolve
    })
    mocks.emitEvents.mockImplementationOnce(async (input) => {
      await firstBatch
      return batchResponse(input)
    })
    const pending = captureActionSubjects({ batchRequests: true })(
      { event: tagging },
      [...subjects, account, subjects[0], account],
      {},
      {},
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.emitEvents).toHaveBeenCalledTimes(3)
    expect(mocks.createSubject).toHaveBeenCalledTimes(202)
    release()
    const result = await pending
    expect(result.succeeded.toSorted()).toEqual(
      [...subjects, account].toSorted(),
    )
    expect(result.failed).toEqual([])
    expect(
      mocks.emitEvents.mock.calls.map(([input]) => input.subjects.length),
    ).toEqual([100, 100, 2])
    for (const [input] of mocks.emitEvents.mock.calls) {
      expect(input.event).toEqual(tagging)
      expect(input.modTool?.meta?.batchSize).toBe(202)
    }
    expect(mocks.emitEvent).not.toHaveBeenCalled()
  })

  it('limits subject resolution to 50 concurrent operations', async () => {
    const subjects = Array.from(
      { length: 151 },
      (_, i) => `did:plc:example${i}`,
    )
    let release!: () => void
    const firstSubjects = new Promise<void>((resolve) => {
      release = resolve
    })
    let active = 0
    let peak = 0
    mocks.createSubject.mockImplementation(async (id) => {
      active += 1
      peak = Math.max(peak, active)
      try {
        await firstSubjects
        return await resolveSubject(id)
      } finally {
        active -= 1
      }
    })
    const pending = captureActionSubjects({ batchRequests: true })(
      { event: tagging },
      subjects,
      {},
      {},
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.createSubject).toHaveBeenCalledTimes(50)
    expect(mocks.emitEvents).not.toHaveBeenCalled()
    release()
    const result = await pending
    expect(peak).toBe(50)
    expect(result.succeeded.toSorted()).toEqual(subjects.toSorted())
    expect(result.failed).toEqual([])
    expect(mocks.emitEvents).toHaveBeenCalledTimes(2)
  })

  it('maps out-of-order results and isolates resolution and validation failures', async () => {
    const invalid = 'invalid-did'
    mocks.createSubject.mockImplementation(async (id) => {
      if (id === record) throw new Error('Record unavailable')
      return resolveSubject(id)
    })
    mocks.emitEvents.mockImplementationOnce(async (input) => ({
      data: {
        events: batchResponse(input).data.events.slice(1),
        failedEvents: [
          { subject: input.subjects[0].subject, error: 'Already taken down' },
        ],
      },
    }))
    const result = await captureActionSubjects({ batchRequests: true })(
      { event: takedown },
      [account, record, otherAccount, invalid],
      {},
      {},
    )
    expect(result.succeeded).toEqual([otherAccount])
    expect(result.failed.toSorted()).toEqual(
      [account, record, invalid].toSorted(),
    )
    expect(mocks.emitEvents.mock.calls[0][0].subjects).toHaveLength(2)
    expect(mocks.emitEvent).not.toHaveBeenCalled()
  })

  it('maps mixed account and record failures by their returned subject', async () => {
    mocks.emitEvents.mockImplementationOnce(async (input) => ({
      data: {
        events: batchResponse(input).data.events.slice(0, 1),
        failedEvents: [{ subject: recordRef, error: 'Record unavailable' }],
      },
    }))
    expect(
      await captureActionSubjects({ batchRequests: true })(
        { event: tagging },
        [account, record],
        {},
        {},
      ),
    ).toEqual({ succeeded: [account], failed: [record] })
  })

  it('treats missing and contradictory result entries as failures', async () => {
    mocks.emitEvents.mockImplementationOnce(async (input) => ({
      data: {
        events: batchResponse(input).data.events.slice(0, 1),
        failedEvents: [{ subject: input.subjects[0].subject, error: 'Failed' }],
      },
    }))
    expect(
      await captureActionSubjects({ batchRequests: true })(
        { event: tagging },
        [account, record],
        {},
        {},
      ),
    ).toEqual({ succeeded: [], failed: [account, record] })
  })

  it('limits requests to 50 concurrent batches and continues after a failure without replaying', async () => {
    const subjects = Array.from(
      { length: 5101 },
      (_, i) => `did:plc:example${i}`,
    )
    let release!: () => void
    const firstWave = new Promise<void>((resolve) => {
      release = resolve
    })
    let active = 0
    let peak = 0
    let started = 0
    mocks.emitEvents.mockImplementation(async (input) => {
      const index = started++
      active += 1
      peak = Math.max(peak, active)
      try {
        if (index < 50) await firstWave
        if (index === 0) throw new Error('Request timed out')
        return batchResponse(input)
      } finally {
        active -= 1
      }
    })
    const pending = captureActionSubjects({ batchRequests: true })(
      { event: tagging },
      subjects,
      {},
      {},
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.emitEvents).toHaveBeenCalledTimes(50)
    expect(mocks.createSubject).toHaveBeenCalledTimes(5000)
    release()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(999)
    expect(mocks.emitEvents).toHaveBeenCalledTimes(50)
    await vi.advanceTimersByTimeAsync(1)
    const result = await pending
    expect(peak).toBe(50)
    expect(result.succeeded.toSorted()).toEqual(subjects.slice(100).toSorted())
    expect(result.failed).toEqual(subjects.slice(0, 100))
    expect(mocks.emitEvents).toHaveBeenCalledTimes(52)
    expect(mocks.emitEvents.mock.calls.at(-1)?.[0].subjects).toHaveLength(1)
    expect(mocks.emitEvent).not.toHaveBeenCalled()
  })

  it('does not submit a batch when all resolutions fail', async () => {
    mocks.createSubject.mockRejectedValue(new Error('Unavailable'))
    expect(
      await captureActionSubjects({ batchRequests: true })(
        { event: tagging },
        [record],
        {},
        {},
      ),
    ).toEqual({ succeeded: [], failed: [record] })
    expect(mocks.emitEvents).not.toHaveBeenCalled()
  })

  it('does not submit unprepared strikes when settings cannot load', async () => {
    mocks.fetchQuery.mockRejectedValue(new Error('Unavailable'))
    expect(
      await captureActionSubjects({ batchRequests: true })(
        { event: { ...takedown, severityLevel: 'Sev 1', strikeCount: 2 } },
        [account, record],
        {},
        {},
      ),
    ).toEqual({ succeeded: [], failed: [account, record] })
    expect(mocks.emitEvents).not.toHaveBeenCalled()
    expect(mocks.emitEvent).not.toHaveBeenCalled()
  })

  it('uses the toggle value for each submission', async () => {
    const action = captureActionSubjects()
    await action(
      { event: tagging },
      [account, record],
      {},
      { batchRequests: true },
    )
    expect(mocks.emitEvents).toHaveBeenCalledOnce()
    expect(mocks.emitEvent).not.toHaveBeenCalled()
    expect(
      await action(
        { event: tagging },
        [account, record],
        {},
        { batchRequests: false },
      ),
    ).toEqual({ succeeded: [account, record], failed: [] })
    expect(mocks.emitEvent).toHaveBeenCalledTimes(2)
    expect(mocks.emitEvents).toHaveBeenCalledOnce()
  })

  it('keeps scheduled actions on the scheduling endpoint', async () => {
    await captureActionSubjects({ batchRequests: true })(
      { event: takedown },
      [account],
      {},
      {
        scheduling: { executeAt: '2026-02-01T00:00:00.000Z' },
      },
    )
    expect(mocks.scheduleAction).toHaveBeenCalledOnce()
    expect(mocks.emitEvents).not.toHaveBeenCalled()
  })

  it.each<Event>([
    { $type: MOD_EVENTS.EMAIL, subjectLine: 'Review', content: 'Hello' },
    { $type: MOD_EVENTS.COMMENT, comment: 'Review', sticky: false },
    { $type: MOD_EVENTS.ESCALATE, comment: 'Review' },
  ])('keeps $type on individual requests', async (event) => {
    await captureActionSubjects({ batchRequests: true })(
      { event },
      [account],
      {},
      {},
    )
    expect(mocks.emitEvent).toHaveBeenCalledOnce()
    expect(mocks.emitEvents).not.toHaveBeenCalled()
  })

  it('keeps chat refs on individual requests alongside batched accounts', async () => {
    const convo = `at://${account}/chat.bsky.convo/example`
    const subject = {
      $type: 'chat.bsky.convo.defs#convoRef',
      did: account,
      convoId: 'example',
    }
    mocks.createSubject.mockImplementation(async (id) =>
      id === convo ? { subject } : resolveSubject(id),
    )
    expect(
      await captureActionSubjects({ batchRequests: true })(
        { event: takedown },
        [convo, account],
        {},
        {},
      ),
    ).toEqual({ succeeded: [convo, account], failed: [] })
    expect(mocks.emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    )
    expect(mocks.emitEvents.mock.calls[0][0].subjects).toEqual([
      { subject: { $type: 'com.atproto.admin.defs#repoRef', did: account } },
    ])
  })
})

describe('tag form events', () => {
  it('trims selected tags and retains a temporary tag duration on bulk actions', async () => {
    const event = getEventFromFormData(
      MOD_EVENTS.TAG,
      form({
        tags: 'reviewed, follow-up ',
        comment: 'Example review',
        durationInHours: '24',
      }),
    )
    const expected = {
      $type: MOD_EVENTS.TAG,
      add: ['reviewed', 'follow-up'],
      remove: [],
      comment: 'Example review',
      durationInHours: 24,
    }
    expect(event).toEqual(expected)
    await captureActionSubjects()({ event }, [account, record], {}, {})
    expect(mocks.emitEvent).toHaveBeenCalledTimes(2)
    for (const [input] of mocks.emitEvent.mock.calls) {
      expect(input.event).toEqual(expected)
    }
  })

  it.each(['0', ''])(
    'omits a duration of "%s" for permanent tags',
    (durationInHours) => {
      const event = getEventFromFormData(
        MOD_EVENTS.TAG,
        form({
          tags: 'reviewed',
          comment: 'Example review',
          durationInHours,
        }),
      )
      expect(event).toEqual(tagging)
      expect(event).not.toHaveProperty('durationInHours')
    },
  )

  it.each([
    [MOD_EVENTS.DISABLE_DMS, ['chat-disabled'], []],
    [MOD_EVENTS.ENABLE_DMS, [], ['chat-disabled']],
    [MOD_EVENTS.DISABLE_VIDEO_UPLOAD, ['video-upload-disabled'], []],
    [MOD_EVENTS.ENABLE_VIDEO_UPLOAD, [], ['video-upload-disabled']],
    [MOD_EVENTS.MAKE_VERIFIER, ['trusted-verifier'], []],
    [MOD_EVENTS.REVOKE_VERIFIER, [], ['trusted-verifier']],
  ])(
    'emits the correct bulk tag operation for %s',
    async (type, add, remove) => {
      const event = getEventFromFormData(
        type,
        form({ comment: 'Example review' }),
      )
      await captureActionSubjects()({ event }, [account, otherAccount], {}, {})
      expect(mocks.emitEvent).toHaveBeenCalledTimes(2)
      for (const [input] of mocks.emitEvent.mock.calls) {
        expect(input.event).toEqual({
          $type: MOD_EVENTS.TAG,
          add,
          remove,
          comment: 'Example review',
        })
      }
    },
  )
})
