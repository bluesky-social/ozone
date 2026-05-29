import {
  AppBskyEmbedRecord,
  ChatBskyActorDefs,
  ChatBskyConvoDefs,
} from '@atproto/api'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { Alert } from '@/common/Alert'
import {
  LoadingDense,
  LoadingFailedDense,
  displayError,
} from '@/common/Loader'
import { RecordEmbedView } from '@/common/posts/PostsFeed'
import { RepoCard } from '@/common/RecordCard'
import { parseAtUri, pluralize } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const useConvo = ({ convoId }: { convoId: string }) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    cacheTime: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    enabled: !!convoId,
    queryKey: ['convoCard', { convoId }],
    queryFn: async () => {
      const { data } = await labelerAgent.api.chat.bsky.convo.getConvo({
        convoId,
      })
      return data.convo
    },
  })
}

const useConvoMessages = ({
  convoId,
  enabled,
}: {
  convoId: string
  enabled: boolean
}) => {
  const labelerAgent = useLabelerAgent()
  return useQuery({
    cacheTime: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    enabled,
    queryKey: ['convoMessages', { convoId }],
    queryFn: async () => {
      const { data } = await labelerAgent.api.chat.bsky.convo.getMessages({
        convoId,
        limit: 20,
      })
      return data.messages
    },
  })
}

export function ConvoCard({ uri }: { uri: string }) {
  const parsed = parseAtUri(uri)
  const convoId = parsed?.rkey ?? ''
  const { data: convo, error, isLoading } = useConvo({ convoId })

  if (!convoId) return null
  if (isLoading) return <LoadingDense />
  if (error) {
    return (
      <LoadingFailedDense
        className="text-gray-600 mb-2"
        error={error}
        noPadding
      />
    )
  }
  if (!convo) return null

  const groupKind = ChatBskyConvoDefs.isGroupConvo(convo.kind)
    ? convo.kind
    : null

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-sm">
      {groupKind ? (
        <GroupConvoHeader kind={groupKind} />
      ) : (
        <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
          Direct conversation
        </p>
      )}
      <MembersList members={convo.members} isGroup={!!groupKind} />
      <ConvoMessages convoId={convoId} />
    </div>
  )
}

function GroupConvoHeader({ kind }: { kind: ChatBskyConvoDefs.GroupConvo }) {
  const isLocked =
    kind.lockStatus === 'locked' || kind.lockStatus === 'locked-permanently'
  const LockIcon = isLocked ? LockClosedIcon : LockOpenIcon
  const lockLabel =
    kind.lockStatus === 'locked-permanently'
      ? 'Locked permanently'
      : kind.lockStatus === 'locked'
        ? 'Locked'
        : 'Unlocked'
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
        {kind.name || 'Group conversation'}
      </p>
      <span
        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
          isLocked
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
            : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
        }`}
        title={`Lock status: ${kind.lockStatus}`}
      >
        <LockIcon className="h-3 w-3" />
        {lockLabel}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-300">
        {pluralize(kind.memberCount, 'member')}
      </span>
    </div>
  )
}

function MembersList({
  members,
  isGroup,
}: {
  members: ChatBskyActorDefs.ProfileViewBasic[]
  isGroup: boolean
}) {
  if (!members.length) return null

  if (!isGroup) {
    return (
      <div className="mt-2 flex flex-col gap-1">
        {members.map((m) => (
          <RepoCard key={m.did} did={m.did} />
        ))}
      </div>
    )
  }

  const owner = members.find(
    (m) =>
      ChatBskyActorDefs.isGroupConvoMember(m.kind) && m.kind.role === 'owner',
  )
  const otherMembers = members.filter((m) => m.did !== owner?.did)

  return (
    <div className="mt-2 flex flex-col gap-2">
      {owner && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 mb-1">
            Owner
          </p>
          <RepoCard did={owner.did} />
        </div>
      )}
      {otherMembers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 mb-1">
            Members shown
          </p>
          <p className="text-xs italic text-gray-400 dark:text-gray-400 mb-1">
            Partial list — not all group members are included here.
          </p>
          <div className="flex flex-col gap-1">
            {otherMembers.map((m) => (
              <MemberRow key={m.did} member={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MemberRow({ member }: { member: ChatBskyActorDefs.ProfileViewBasic }) {
  let label = ''
  if (ChatBskyActorDefs.isGroupConvoMember(member.kind)) {
    if (member.kind.role !== 'standard') label = member.kind.role
  } else if (ChatBskyActorDefs.isPastGroupConvoMember(member.kind)) {
    label = 'past member'
  }
  return (
    <div>
      {label && (
        <p className="text-xs italic text-gray-400 dark:text-gray-400">
          {label}
        </p>
      )}
      <RepoCard did={member.did} />
    </div>
  )
}

function ConvoMessages({ convoId }: { convoId: string }) {
  const [show, setShow] = useState(false)
  const {
    data: messages,
    error,
    isLoading,
  } = useConvoMessages({ convoId, enabled: show })

  return (
    <div className="mt-3">
      <button
        type="button"
        className="font-bold"
        onClick={() => setShow((s) => !s)}
      >
        Conversation messages
        {show ? (
          <ChevronUpIcon className="h-3 w-3 ml-1 inline" />
        ) : (
          <ChevronDownIcon className="h-3 w-3 ml-1 inline" />
        )}
      </button>
      {show && isLoading && <p className="mt-1">Loading messages...</p>}
      {show && !!error && (
        <div className="mt-2">
          <Alert
            type="error"
            title="Failed to load messages"
            body={displayError(error)}
          />
        </div>
      )}
      {show && messages && messages.length === 0 && (
        <p className="mt-1 italic text-gray-500 dark:text-gray-300">
          No messages found.
        </p>
      )}
      {show &&
        messages?.map((message, i) => (
          <ConvoMessageItem key={getMessageKey(message, i)} message={message} />
        ))}
    </div>
  )
}

type ConvoMessage =
  | ChatBskyConvoDefs.MessageView
  | ChatBskyConvoDefs.DeletedMessageView
  | ChatBskyConvoDefs.SystemMessageView
  | { $type: string }

function getMessageKey(message: ConvoMessage, fallback: number): string | number {
  if ('id' in message && typeof message.id === 'string') {
    return message.id
  }
  return fallback
}

function ConvoMessageItem({ message }: { message: ConvoMessage }) {
  if (ChatBskyConvoDefs.isMessageView(message)) {
    const embed = AppBskyEmbedRecord.isView(message.embed) ? (
      <RecordEmbedView embed={message.embed} />
    ) : null
    return (
      <div className="pt-2">
        <MessageSenderInfo did={message.sender.did} sentAt={message.sentAt} />
        {embed}
        <p className="break-all">{message.text}</p>
      </div>
    )
  }
  if (ChatBskyConvoDefs.isDeletedMessageView(message)) {
    return (
      <div className="pt-2">
        <MessageSenderInfo did={message.sender.did} sentAt={message.sentAt} />
        <p>
          <i>Deleted message</i>
        </p>
      </div>
    )
  }
  if (ChatBskyConvoDefs.isSystemMessageView(message)) {
    return (
      <div className="pt-2">
        <p className="text-xs italic text-gray-500 dark:text-gray-300">
          System message
          <span className="ml-1">
            {dateFormatter.format(new Date(message.sentAt))}
          </span>
        </p>
      </div>
    )
  }
  return (
    <div className="pt-2">
      <p>
        <i>Unknown message type</i>
      </p>
    </div>
  )
}

function MessageSenderInfo({ did, sentAt }: { did: string; sentAt: string }) {
  return (
    <p>
      <i>
        <Link
          target="_blank"
          href={`/repositories/${did}`}
          className="underline"
        >
          {did}
        </Link>{' '}
        <span className="text-xs text-gray-400">
          {dateFormatter.format(new Date(sentAt))}
        </span>
      </i>
    </p>
  )
}
