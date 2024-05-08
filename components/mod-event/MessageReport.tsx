import { Alert } from '@/common/Alert'
import client from '@/lib/client'
import { ChatBskyConvoDefs } from '@atproto/api'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

const MockMessages = [
  {
    $type: 'chat.bsky.convo.defs#messageView',
    id: 'msg1',
    rev: '1',
    text: 'Hello, how are you?',
    sender: { did: 'sender1' },
    sentAt: '2023-05-08T09:00:00.000Z',
  },
  {
    $type: 'chat.bsky.convo.defs#messageView',
    id: 'xyz',
    rev: '1',
    text: 'I am fine, thank you!',
    sender: { did: 'did:plc:s3sfor4vczbude7suqlj6xyf' },
    sentAt: '2023-05-08T09:01:00.000Z',
  },
  {
    $type: 'chat.bsky.convo.defs#deletedMessageView',
    id: 'msg3',
    rev: '1',
    text: 'I am fine, thank you!',
    sender: { did: 'sender2' },
    sentAt: '2023-05-08T09:01:00.000Z',
  },
  {
    $type: 'chat.bsky.convo.defs#messageView',
    id: 'msg4',
    rev: '1',
    text: 'This is random!',
    sender: { did: 'did:plc:s3sfor4vczbude7suqlj6xyf' },
    sentAt: '2023-05-08T09:01:00.000Z',
  },
]

const useMessageContext = (messageId) => {
  return useQuery({
    cacheTime: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
    retry: 0,
    queryKey: ['messageContext', { messageId }],
    queryFn: async () => {
      // const { data } = await client.api.chat.bsky.moderation.getMessageContext(
      //   { messageId },
      //   { headers: client.proxyHeaders() },
      // )
      return new Promise((resolve) =>
        setTimeout(() => resolve(MockMessages), 3000),
      )
      return data.messages
    },
  })
}

export const MessageReport = ({
  subject,
}: {
  subject: ChatBskyConvoDefs.MessageRef
}) => {
  const {
    data: messages,
    error,
    isLoading,
  } = useMessageContext(subject.messageId)
  const [showMessageContext, setShowMessageContext] = useState(true)

  if (isLoading) {
    return <p className="mt-3">Loading message context...</p>
  }

  if (error) {
    return (
      <div className="mt-3">
        <Alert
          type="error"
          body={`${error}`}
          title="Message context loading failed"
        />
      </div>
    )
  }

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="mt-3">
      <button
        className="font-bold underline"
        onClick={(e) => {
          e.preventDefault()
          setShowMessageContext((show) => !show)
        }}
      >
        Message context
      </button>
      {showMessageContext &&
        messages?.map((message, i) => {
          const senderInfo = (
            <p>
              <i>
                {message.sender?.did === subject.did
                  ? 'Reported User'
                  : 'Recipient'}{' '}
                <span className="text-xs text-gray-400">
                  {dateFormatter.format(new Date(message.sentAt))}
                </span>
              </i>
            </p>
          )
          if (ChatBskyConvoDefs.isDeletedMessageView(message)) {
            return (
              <div key={message.id} className="pt-2">
                {senderInfo}
                <p>
                  <i>Deleted message</i>
                </p>
              </div>
            )
          }
          if (ChatBskyConvoDefs.isMessageView(message)) {
            return (
              <div key={message.id} className="pt-2">
                {senderInfo}
                <p>
                  {message.text}
                  {message.id === subject.messageId
                    ? ' (Reported message)'
                    : ''}
                </p>
              </div>
            )
          }
          return null
        })}
    </div>
  )
}
