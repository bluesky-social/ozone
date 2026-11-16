import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOD_EVENTS } from '@/mod-event/constants'
import { useQuickAction } from './useQuickAction'

const mocks = vi.hoisted(() => ({
  eventType: '',
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
          ? { repo: mocks.repo, labels: [{ val: 'message-only' }] }
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
    getRecommendedAction: () => null,
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

function capture(subject: string) {
  let action!: ReturnType<typeof useQuickAction>
  function Capture() {
    action = useQuickAction({
      subject,
      setSubject: () => {},
      onCancel: () => {},
      onSubmit: mocks.onSubmit,
    })
    return null
  }
  renderToStaticMarkup(<Capture />)
  return action
}

beforeEach(() => {
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
