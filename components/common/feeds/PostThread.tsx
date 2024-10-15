import {
  AppBskyFeedGetPostThread as GetPostThread,
  AppBskyFeedDefs,
  AtUri,
} from '@atproto/api'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Dropdown } from '@/common/Dropdown'
import { PostAsCard } from '@/common/posts/PostsFeed'
import { classNames, unique } from '@/lib/util'
import { ReactNode } from 'react'
import { useWorkspaceAddItemsMutation } from '@/workspace/hooks'

export function Thread({
  thread,
}: {
  thread: GetPostThread.OutputSchema['thread']
}) {
  const { mutateAsync: addToWorkspace } = useWorkspaceAddItemsMutation()
  const addPostsToWorkspace = () => {
    addToWorkspace(getValuesFromThread(thread, 'postUri'))
  }
  const addParticipantsToWorkspace = () => {
    addToWorkspace(getValuesFromThread(thread, 'participantDid'))
  }
  return (
    <div className="flex flex-col mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="mx-2 flex flex-row justify-end">
        <Dropdown
          className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
          items={[
            { text: 'All Posts', id: 'posts', onClick: addPostsToWorkspace },
            {
              text: 'All Participants',
              id: 'participants',
              onClick: addParticipantsToWorkspace,
            },
          ]}
        >
          Add to workspace
          <ChevronDownIcon
            className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
            aria-hidden="true"
          />
        </Dropdown>
      </div>
      <ThreadPost highlight depth={getThreadDepth(thread)} thread={thread} />
    </div>
  )
}

export function ThreadPost({
  depth,
  thread,
  highlight,
}: {
  depth: number
  thread: GetPostThread.OutputSchema['thread']
  highlight?: boolean
}) {
  if (AppBskyFeedDefs.isThreadViewPost(thread)) {
    return (
      <>
        {thread.parent && (
          <ThreadPost depth={depth - 1} thread={thread.parent} />
        )}
        <ThreadPostWrapper depth={depth} highlight={highlight}>
          <PostAsCard
            className="bg-transparent px-3 py-2"
            item={thread}
            dense
          />
        </ThreadPostWrapper>
        {thread.replies?.map((reply, i) => (
          <ThreadPost
            key={`${thread.post.uri}-reply-${i}`}
            depth={depth + 1}
            thread={reply}
          />
        ))}
      </>
    )
  } else if (AppBskyFeedDefs.isNotFoundPost(thread)) {
    return (
      <ThreadPostWrapper depth={depth}>
        Not found: ${thread.uri}
      </ThreadPostWrapper>
    )
  } else {
    return <ThreadPostWrapper depth={depth}>Unknown</ThreadPostWrapper>
  }
}

export function ThreadPostWrapper({
  depth,
  highlight,
  children,
}: {
  depth: number
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <div
      style={{ marginLeft: depth * 12 }}
      className={classNames('p-2', highlight ? 'bg-amber-100' : '')}
    >
      {children}
    </div>
  )
}

export function getThreadDepth(thread: GetPostThread.OutputSchema['thread']) {
  let depth = 0
  while (AppBskyFeedDefs.isThreadViewPost(thread.parent)) {
    thread = thread.parent
    depth++
  }
  return depth
}

function getValuesFromThread(
  thread: GetPostThread.OutputSchema['thread'],
  mapValue: 'postUri' | 'participantDid',
) {
  const values: string[] = []

  // Helper function to traverse and collect URIs
  const collectValues = (thread: GetPostThread.OutputSchema['thread']) => {
    if (AppBskyFeedDefs.isThreadViewPost(thread)) {
      values.push(
        mapValue === 'postUri' ? thread.post.uri : thread.post.author.did,
      )

      // Recursively collect values from replies
      thread.replies?.forEach((reply) => {
        collectValues(reply)
      })
    }

    if (AppBskyFeedDefs.isNotFoundPost(thread)) {
      // For not found posts, let's build the participant DID from post uri
      values.push(
        mapValue === 'postUri' ? thread.uri : new AtUri(thread.uri).hostname,
      )
    }

    if (AppBskyFeedDefs.isBlockedPost(thread)) {
      values.push(mapValue === 'postUri' ? thread.uri : thread.author.did)
    }
  }

  // Traverse up the parent chain to get all parent post items
  let currentThread = thread
  while (AppBskyFeedDefs.isThreadViewPost(currentThread.parent)) {
    currentThread = currentThread.parent
    values.push(currentThread.post.uri)
  }

  // Start collecting values from the original thread and its replies
  collectValues(thread)

  return unique(values)
}
