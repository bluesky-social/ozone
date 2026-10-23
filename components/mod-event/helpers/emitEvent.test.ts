import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type {
  ToolsOzoneModerationEmitEvent,
  ToolsOzoneModerationScheduleAction,
} from '@atproto/api'
import { MOD_EVENTS } from '../constants'
import { getEventFromFormData, useActionSubjects } from './emitEvent'

type Event = ToolsOzoneModerationEmitEvent.InputSchema['event']

const mocks = vi.hoisted(() => ({
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

function captureActionSubjects() {
  let action: ReturnType<typeof useActionSubjects> | undefined
  function Capture() {
    action = useActionSubjects()
    return null
  }
  renderToStaticMarkup(createElement(Capture))
  return action!
}

const resolveSubject = async (id: string) => ({
  subject:
    id === record
      ? recordRef
      : { $type: 'com.atproto.admin.defs#repoRef', did: id },
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  mocks.createSubject.mockImplementation(resolveSubject)
  mocks.emitEvent.mockResolvedValue({ data: {} })
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
