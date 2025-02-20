import { AppBskyFeedDefs } from '@atproto/api'
import Link from 'next/link'
import { useActionPanelLink } from '../useActionPanelLink'

export const ReplyParent = ({
  reply,
  inline = false,
}: {
  reply: AppBskyFeedDefs.ReplyRef
  inline?: boolean
}) => {
  const { parent } = reply
  const Wrapper = inline ? 'span' : 'p'
  const createLinkToActionPanel = useActionPanelLink()

  if (!('uri' in parent)) return null
  const linkToParentPost = (text: string = 'Reply') => (
    <Link className="underline" href={createLinkToActionPanel(`${parent.uri}`)}>
      {text}
    </Link>
  )

  if (AppBskyFeedDefs.isNotFoundPost(parent)) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {linkToParentPost()} to a deleted post
      </Wrapper>
    )
  }

  if (!parent.author) {
    const userText = AppBskyFeedDefs.isBlockedPost(parent)
      ? 'a user who blocked the author'
      : 'an anonymous user'
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {linkToParentPost()} to {userText}
      </Wrapper>
    )
  }

  const userText = AppBskyFeedDefs.isBlockedPost(parent)
    ? 'a user who blocked the author'
    : `@${parent.author.handle}`

  return (
    <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
      {linkToParentPost()} to{' '}
      <Link
        href={createLinkToActionPanel(parent.author.did)}
        className="underline"
      >
        {userText}
      </Link>
    </Wrapper>
  )
}
