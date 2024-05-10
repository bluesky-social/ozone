import { Alert } from '@/common/Alert'
import { ComponentProps, useState } from 'react'
import client from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { ChatBskyModerationGetActorMetadata } from '@atproto/api'

const MockData: ChatBskyModerationGetActorMetadata.OutputSchema = {
  day: {
    messagesSent: 25,
    messagesReceived: 30,
    convos: 10,
    convosStarted: 5,
  },
  month: {
    messagesSent: 700,
    messagesReceived: 650,
    convos: 300,
    convosStarted: 150,
  },
  all: {
    messagesSent: 1500,
    messagesReceived: 1450,
    convos: 800,
    convosStarted: 400,
  },
}

export const useMessageActorMeta = ({
  did,
  enabled,
}: {
  did: string
  enabled: boolean
}) => {
  // This query is a bit expensive but the data does change relatively frequently so we wanna cache it for only 10m
  return useQuery<
    unknown,
    unknown,
    Record<string, ChatBskyModerationGetActorMetadata.Metadata>
  >({
    cacheTime: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    enabled,
    queryKey: ['messageActorMeta', { did }],
    queryFn: async () => {
      // TODO: Use this instead of the mock data
      // const { data } = await client.api.chat.bsky.moderation.getActorMetadata(
      // { actor: did },
      // { headers: client.proxyHeaders() },
      // )
      return new Promise((resolve) => setTimeout(() => resolve(MockData), 3000))
    },
  })
}

export const MessageActorMeta = ({
  did,
  ...rest
}: { did: string } & ComponentProps<'div'>) => {
  // This data is not critical so let's not load this unless a user asks for it
  const [showActorMeta, setShowActorMeta] = useState(false)
  const { isLoading, data, error } = useMessageActorMeta({
    did,
    enabled: showActorMeta,
  })

  // Loading message should only come up when the user has requested to see the data
  if (isLoading && showActorMeta) {
    return (
      <div {...rest}>
        <p>Loading user{"'"}s messaging data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div {...rest}>
        <Alert
          type="error"
          body={`${error}`}
          title="Failed loading user's messaging data"
        />
      </div>
    )
  }

  return (
    <div {...rest}>
      <button
        className="font-bold mb-1"
        onClick={(e) => {
          e.preventDefault()
          setShowActorMeta((show) => !show)
        }}
      >
        User{"'"}s messaging data
        {showActorMeta ? (
          <ChevronUpIcon className="h-3 w-3 ml-1 inline" />
        ) : (
          <ChevronDownIcon className="h-3 w-3 ml-1 inline" />
        )}
      </button>
      {showActorMeta &&
        (data ? (
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="table-auto w-full text-left">
              <thead className="dark:bg-slate-700 bg-gray-200">
                <tr>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Sent</th>
                  <th className="px-4 py-2">Received</th>
                  <th className="px-4 py-2">Convos</th>
                  <th className="px-4 py-2">Started</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).map(
                  ([
                    key,
                    { messagesSent, messagesReceived, convos, convosStarted },
                  ]) => (
                    <tr
                      key={key}
                      className="border-b dark:border-slate-700 border-gray-300"
                    >
                      <td className="px-4 py-2 capitalize">{key}</td>
                      <td className="px-4 py-2">{messagesSent}</td>
                      <td className="px-4 py-2">{messagesReceived}</td>
                      <td className="px-4 py-2">{convos}</td>
                      <td className="px-4 py-2">{convosStarted}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <Alert type="error" title="No messaging data found" />
        ))}
    </div>
  )
}
