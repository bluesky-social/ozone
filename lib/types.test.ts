import { expect, it } from 'vitest'
import { validSubjectString } from './types'

it('round-trips a message status to its synthetic URI', () => {
  expect(
    validSubjectString({
      $type: 'chat.bsky.convo.defs#messageRef',
      did: 'did:plc:alice',
      convoId: 'convo',
      messageId: 'message',
    }),
  ).toBe('at://did:plc:alice/chat.bsky.convo.message/message')
})
