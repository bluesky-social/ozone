import { ChatBskyConvoDefs } from '@atproto/api'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { useQuery } from '@tanstack/react-query'
import { ComponentProps, useState } from 'react'

import { Alert } from '@/common/Alert'
import { RecordEmbedView } from '@/common/posts/PostsFeed'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const useMessageContext = ({ messageId, did }) => {
  const labelerAgent = useLabelerAgent()

  return useQuery({
    // Message context isn't likely to change, so cache for a long time
    cacheTime: 4 * 60 * 60 * 1000,
    staleTime: 4 * 60 * 60 * 1000,
    retry: 0,
    queryKey: ['messageContext', { messageId }],
    queryFn: async () => {
      const { data } =
        await labelerAgent.api.chat.bsky.moderation.getMessageContext({
          messageId,
        })
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
          if (ChatBskyConvoDefs.isDeletedMessageView(message)) {
            return (
              <div key={message.id} className="pt-2">
                <MessageSenderInfo {...{ message, subject }} />
                <p>
                  <i>Deleted message</i>
                </p>
              </div>
            )
          }
          if (ChatBskyConvoDefs.isMessageView(message)) {
            let embedView: React.ReactNode = null
            const texts = [
              message.text,
              message.id === subject.messageId ? '(Reported message)' : '',
            ]
            if (message.embed) {
              embedView = <RecordEmbedView embed={message.embed} />
              texts.push('(Embed)')
            }
            return (
              <div key={message.id} className="pt-2">
                <MessageSenderInfo {...{ message, subject }} />
                {embedView}
                <p className="break-all">{texts.join(' ')}</p>
              </div>
            )
          }
          return (
            <div key={i} className="pt-2">
              <p>
                <i>Unknown message type</i>
                {JSON.stringify(message)}
              </p>
            </div>
          )
        })}
    </div>
  )
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const MessageSenderInfo = ({
  message,
  subject,
}: {
  subject: ChatBskyConvoDefs.MessageRef
  message: ChatBskyConvoDefs.MessageView | ChatBskyConvoDefs.DeletedMessageView
}) => (
  <p>
    <i>
      <a
        target="_blank"
        href={`/repositories/${message.sender.did}`}
        className="underline"
      >
        {message.sender.did === subject.did ? 'Reported User' : 'Recipient'}
      </a>{' '}
      <span className="text-xs text-gray-400">
        {dateFormatter.format(new Date(message.sentAt))}
      </span>
    </i>
  </p>
)
