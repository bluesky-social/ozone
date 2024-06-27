import { AppBskyActorDefs, AppBskyFeedDefs } from '@atproto/api'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useActionPanelLink } from '../useActionPanelLink'

export const ReplyParent = ({
  reply,
  inline = false,
}: {
  reply: AppBskyFeedDefs.ReplyRef
  inline?: boolean
}) => {
  const parent = reply.parent
  const Wrapper = inline ? 'span' : 'p'
  const createLinkToActionPanel = useActionPanelLink()
  const linkToParentPost = (text: string = 'Reply') => (
    <Link className="underline" href={createLinkToActionPanel(`${parent.uri}`)}>
      {text}
    </Link>
  )

  if (!parent) return null

  if (parent.notFound) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {linkToParentPost()} to a deleted post
      </Wrapper>
    )
  }

  const parentAuthor = parent.author as AppBskyActorDefs.ProfileViewBasic

  if (!parentAuthor) {
    const userText = parent.blocked
      ? 'a user who blocked the author'
      : 'an anonymous user'
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {linkToParentPost()} to {userText}
      </Wrapper>
    )
  }

  const userText = parent.blocked
    ? 'a user who blocked the author'
    : `@${parentAuthor.handle}`
  return (
    <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
      {linkToParentPost()} to{' '}
      <Link
        href={createLinkToActionPanel(parentAuthor.did)}
        className="underline"
      >
        {userText}
      </Link>
    </Wrapper>
  )
}
