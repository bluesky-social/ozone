import { AppBskyActorDefs, AppBskyFeedDefs } from '@atproto/api'
import Link from 'next/link'

export const ReplyParent = ({
  reply,
  inline = false,
}: {
  reply: AppBskyFeedDefs.ReplyRef
  inline?: boolean
}) => {
  const parent = reply.parent
  const Wrapper = inline ? 'span' : 'p'

  if (!parent) return null
  if (parent.notFound) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        Reply to a deleted post
      </Wrapper>
    )
  }

  const parentAuthor = parent.author as AppBskyActorDefs.ProfileViewBasic

  if (!parentAuthor) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        Reply to an anonymous post
      </Wrapper>
    )
  }

  return (
    <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
      Reply to{' '}
      <Link
        href={`/repositories/${parentAuthor.handle}`}
        className="hover:underline"
      >
        @{parentAuthor.handle}
      </Link>
    </Wrapper>
  )
}
