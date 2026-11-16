import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOD_EVENTS } from '@/mod-event/constants'
import type { ActionRecommendation } from '@/mod-event/helpers/useActionRecommendation'
import { useQuickAction } from './useQuickAction'

const mocks = vi.hoisted(() => ({
  eventType: '',
  effects: [] as Array<() => void | (() => void)>,
  recommendation: null as ActionRecommendation | null,
  formValues: {} as Record<string, string>,
  onSubmit: vi.fn(),
  createSubject: vi.fn(),
  compileTakedownEmail: vi.fn().mockReturnValue('email'),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
  repo: {
    did: 'did:plc:alice',
    labels: [{ val: 'existing', src: 'did:plc:labeler' }],
    moderation: { subjectStatus: { tags: [] } },
  },
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)) => {
      mocks.effects.push(effect)
    },
    useState: (initial: unknown) =>
      actual.useState(
        initial === 'tools.ozone.moderation.defs#modEventAcknowledge'
          ? mocks.eventType
          : initial,
      ),
  }
})
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
    useQuery: ({ queryKey }: { queryKey: string[] }) => ({
      data:
        queryKey[0] === 'modActionSubject'
          ? {
              repo: mocks.repo,
              record: { value: { text: 'Example post content.' } },
              labels: [{ val: 'message-only' }],
            }
          : undefined,
      isFetching: false,
      isError: false,
      refetch: mocks.refetch,
    }),
  }
})
vi.mock('@/shell/ConfigurationContext', () => ({
  useConfigurationContext: () => ({ config: { did: 'did:plc:labeler' } }),
  useLabelerAgent: () => ({ assertDid: 'did:plc:labeler' }),
  usePermission: () => false,
}))
vi.mock('@/reports/helpers/subject', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/reports/helpers/subject')>()
  return { ...actual, useCreateSubjectFromId: () => mocks.createSubject }
})
vi.mock('@/setting/policy/usePolicyList', () => ({
  usePolicyListSetting: () => ({}),
}))
vi.mock('@/setting/severity-level/useSeverityLevel', () => ({
  useSeverityLevelSetting: () => ({}),
}))
vi.mock('@/mod-event/helpers/useActionRecommendation', () => ({
  useActionRecommendation: () => ({
    currentStrikes: 0,
    getRecommendedAction: () => mocks.recommendation,
    getLastContentTakedownDetails: () => null,
  }),
}))
vi.mock('components/communication-template/hooks', () => ({
  useCommunicationTemplateList: () => ({}),
}))
vi.mock('@/email/useEmailRecipientStatus', () => ({
  useEmailRecipientStatus: () => ({}),
}))
vi.mock('@/common/useColorScheme', () => ({
  useColorScheme: () => ({ theme: 'light' }),
}))
vi.mock('./useTakedownEmail', () => ({
  compileTakedownEmail: mocks.compileTakedownEmail,
  compileTakedownSubject: () => 'subject',
}))
vi.mock('react-use', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-use')>()),
  useKeyPressEvent: () => {},
}))

const message = 'at://did:plc:alice/chat.bsky.convo.message/abc'
const record = 'at://did:plc:alice/app.bsky.feed.post/abc'

function capture(subject: string, applyToAccount = false, selectPolicy = false) {
  let action!: ReturnType<typeof useQuickAction>
  function Capture() {
    mocks.effects = []
    action = useQuickAction({
      subject,
      applyToAccount,
      setSubject: () => {},
      onCancel: () => {},
      onSubmit: mocks.onSubmit,
    })
    if (selectPolicy && !action.selectedPolicyName) {
      action.handlePolicySelect('Example policy')
      action.handleSeverityLevelSelect('Example severity')
    }
    return null
  }
  renderToStaticMarkup(<Capture />)
  const effects = mocks.effects
  return { ...action, flushEffects: () => effects.forEach((effect) => effect()) }
}

beforeEach(() => {
  mocks.effects = []
  mocks.recommendation = null
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  mocks.formValues = {
    labels: 'existing,new',
    policies: 'policy',
    durationInHours: '24',
  }
  mocks.compileTakedownEmail.mockClear()
  mocks.onSubmit.mockReset().mockResolvedValue(undefined)
  mocks.createSubject
    .mockReset()
    .mockImplementation(async (subject: string) => ({
      subject: subject.startsWith('did:')
        ? { $type: 'com.atproto.admin.defs#repoRef', did: subject }
        : {
            $type: 'chat.bsky.convo.defs#messageRef',
            did: 'did:plc:alice',
            convoId: 'convo',
            messageId: 'abc',
          },
      record: null,
    }))
  vi.stubGlobal(
    'FormData',
    class {
      get(name: string) {
        return mocks.formValues[name] ?? null
      }
      getAll() {
        return []
      }
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('message account actions', () => {
  it.each([MOD_EVENTS.LABEL, MOD_EVENTS.TAKEDOWN, MOD_EVENTS.REVERSE_TAKEDOWN])(
    'shows the account target and submits %s to the account',
    async (eventType) => {
      mocks.eventType = eventType
      const action = capture(message)
      expect(action.applyToAccount).toBe(true)
      expect(action.messageAccountAction).toContain('account')
      await action.onFormSubmit({
        preventDefault() {},
        currentTarget: { reset() {} },
      } as unknown as React.FormEvent<HTMLFormElement>)
      expect(mocks.createSubject).toHaveBeenCalledWith(
        'did:plc:alice',
        undefined,
      )
      expect(mocks.onSubmit).toHaveBeenCalledTimes(1)
      expect(mocks.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: {
            $type: 'com.atproto.admin.defs#repoRef',
            did: 'did:plc:alice',
          },
          event: expect.objectContaining({ $type: eventType }),
        }),
      )
      if (eventType === MOD_EVENTS.LABEL) {
        expect(mocks.onSubmit.mock.calls[0][0].event).toMatchObject({
          createLabelVals: ['new'],
          negateLabelVals: [],
        })
      }
    },
  )

  it('keeps supported message actions on the message', async () => {
    mocks.eventType = MOD_EVENTS.ACKNOWLEDGE
    const action = capture(message)
    expect(action.applyToAccount).toBe(false)
    expect(action.messageAccountAction).toBeNull()
    await action.onFormSubmit({
      preventDefault() {},
      currentTarget: { reset() {} },
    } as unknown as React.FormEvent<HTMLFormElement>)
    expect(mocks.createSubject).toHaveBeenCalledWith(message, undefined)
    expect(mocks.onSubmit.mock.calls[0][0].subject.$type).toBe(
      'chat.bsky.convo.defs#messageRef',
    )
  })

  it('describes the account in an automated message takedown email', () => {
    mocks.eventType = MOD_EVENTS.TAKEDOWN
    const action = capture(message)
    action.onEmailTemplateSelect('')
    expect(mocks.compileTakedownEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subjectName: 'account' }),
    )
  })

  it('acknowledges the message after applying a label to the account', async () => {
    mocks.eventType = MOD_EVENTS.LABEL
    mocks.formValues.additionalAcknowledgeEvent = 'true'
    const action = capture(message)
    await action.onFormSubmit({
      preventDefault() {},
      currentTarget: { reset() {} },
    } as unknown as React.FormEvent<HTMLFormElement>)
    expect(mocks.onSubmit).toHaveBeenCalledTimes(2)
    expect(mocks.onSubmit.mock.calls[0][0].subject.$type).toBe(
      'com.atproto.admin.defs#repoRef',
    )
    expect(mocks.onSubmit.mock.calls[1][0]).toMatchObject({
      subject: { $type: 'chat.bsky.convo.defs#messageRef' },
      event: { $type: MOD_EVENTS.ACKNOWLEDGE },
    })
  })

  it('does not submit the account action if the requested message review cannot be identified', async () => {
    mocks.eventType = MOD_EVENTS.LABEL
    mocks.formValues.additionalAcknowledgeEvent = 'true'
    mocks.createSubject.mockImplementation(async (subject: string) => {
      if (subject === message) throw new Error('Message not found')
      return {
        subject: { $type: 'com.atproto.admin.defs#repoRef', did: subject },
        record: null,
      }
    })
    const action = capture(message)
    await action.onFormSubmit({
      preventDefault() {},
      currentTarget: { reset() {} },
    } as unknown as React.FormEvent<HTMLFormElement>)
    expect(mocks.onSubmit).not.toHaveBeenCalled()
  })

  it('does not automatically change the target of a record action', () => {
    mocks.eventType = MOD_EVENTS.TAKEDOWN
    const action = capture(record)
    expect(action.applyToAccount).toBe(false)
    expect(action.messageAccountAction).toBeNull()
  })
})

describe('automated takedown email targets', () => {
  it('uses account copy without record content when targeting the account from a record', () => {
    mocks.eventType = MOD_EVENTS.TAKEDOWN
    capture(record, true).onEmailTemplateSelect('')
    expect(mocks.compileTakedownEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        subjectName: 'account',
        recordContent: undefined,
      }),
    )
  })

  it.each(['did:plc:alice', message])(
    'omits record content for the account action on %s',
    (subject) => {
      mocks.eventType = MOD_EVENTS.TAKEDOWN
      capture(subject).onEmailTemplateSelect('')
      expect(mocks.compileTakedownEmail).toHaveBeenLastCalledWith(
        expect.objectContaining({
          subjectName: 'account',
          recordContent: undefined,
        }),
      )
    },
  )

  it('uses the selected target when switching between content and account actions', () => {
    mocks.eventType = MOD_EVENTS.TAKEDOWN
    for (const applyToAccount of [false, true, false]) {
      capture(record, applyToAccount).onEmailTemplateSelect('')
      expect(mocks.compileTakedownEmail).toHaveBeenLastCalledWith(
        expect.objectContaining({
          subjectName: applyToAccount ? 'account' : 'Post',
          recordContent: applyToAccount ? undefined : 'Example post content.',
        }),
      )
    }
  })
})

describe('account action duration defaults', () => {
  it.each([
    { subject: record, applyToAccount: true, duration: 24, expected: '24' },
    { subject: record, applyToAccount: true, duration: null, expected: '0' },
    {
      subject: 'did:plc:alice',
      applyToAccount: false,
      duration: 24,
      expected: '24',
    },
    { subject: message, applyToAccount: false, duration: 24, expected: '24' },
    { subject: record, applyToAccount: false, duration: 24, expected: '168' },
  ])(
    'sets $subject duration to $expected with account targeting $applyToAccount',
    ({ subject, applyToAccount, duration, expected }) => {
      mocks.eventType = MOD_EVENTS.TAKEDOWN
      mocks.recommendation = {
        totalStrikes: 8,
        recommendedDuration: duration ?? 0,
        suspensionDurationInHours: duration,
        isPermanent: duration === null,
        actualStrikesToApply: 1,
        message: 'Example recommendation',
      }
      const action = capture(subject, applyToAccount, true)
      const selector = { value: '168' }
      Object.assign(action.durationSelectorRef, { current: selector })
      action.flushEffects()
      expect(selector.value).toBe(expected)
      expect(action.isAccountAction).toBe(applyToAccount || subject !== record)
    },
  )

  it('keeps the selected account duration until a recommendation is available', () => {
    mocks.eventType = MOD_EVENTS.TAKEDOWN
    const action = capture(record, true)
    const selector = { value: '72' }
    Object.assign(action.durationSelectorRef, { current: selector })
    action.flushEffects()
    expect(selector.value).toBe('72')
  })
})
