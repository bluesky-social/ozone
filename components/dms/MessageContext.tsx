import { Alert } from '@/common/Alert'
import client from '@/lib/client'
import { ChatBskyConvoDefs } from '@atproto/api'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { useQuery } from '@tanstack/react-query'
import { ComponentProps, useState } from 'react'

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

const useMessageContext = ({ messageId, did }) => {
  return useQuery({
    cacheTime: 4 * 60 * 60 * 1000,
    staleTime: 4 * 60 * 60 * 1000,
    retry: 0,
    queryKey: ['messageContext', { messageId }],
    queryFn: async () => {
      // TODO: Use this instead of the mock data
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

export const MessageContext = ({
  subject,
  ...rest
}: {
  subject: ChatBskyConvoDefs.MessageRef
} & ComponentProps<'div'>) => {
  const { data: messages, error, isLoading } = useMessageContext(subject)
  const [showMessageContext, setShowMessageContext] = useState(true)

  if (isLoading) {
    return (
      <div {...rest}>
        <p>Loading message context...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div {...rest}>
        <Alert
          type="error"
          body={`${error} Message ID ${subject.messageId}`}
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
    <div {...rest}>
      <button
        className="font-bold"
        onClick={(e) => {
          e.preventDefault()
          setShowMessageContext((show) => !show)
        }}
      >
        Message context
        {showMessageContext ? (
          <ChevronUpIcon className="h-3 w-3 ml-1 inline" />
        ) : (
          <ChevronDownIcon className="h-3 w-3 ml-1 inline" />
        )}
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
