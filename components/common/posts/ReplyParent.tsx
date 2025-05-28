import { AppBskyFeedDefs } from '@atproto/api'
import Link from 'next/link'
import { ReactNode } from 'react'
import { useActionPanelLink } from '../useActionPanelLink'

export const ReplyParent = ({
  parent,
  inline = false,
}: {
  parent: AppBskyFeedDefs.ReplyRef['parent'] | AppBskyFeedDefs.ThreadViewPost
  inline?: boolean
}) => {
  const Wrapper = inline ? 'span' : 'p'

  if (AppBskyFeedDefs.isNotFoundPost(parent)) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        <LinkToPost post={parent} /> to a deleted post
      </Wrapper>
    )
  }

  if (AppBskyFeedDefs.isBlockedPost(parent)) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {parent.author ? (
          <>
            <LinkToPost post={parent} /> to{' '}
            <LinkToPostAuthor post={parent}>
              a user who blocked the author
            </LinkToPostAuthor>
          </>
        ) : (
          <>
            <LinkToPost post={parent} /> to a user who blocked the author
          </>
        )}
      </Wrapper>
    )
  }

  if (AppBskyFeedDefs.isPostView(parent)) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {parent.author ? (
          <>
            <LinkToPost post={parent} /> to{' '}
            <LinkToPostAuthor post={parent}>
              @{parent.author.handle}
            </LinkToPostAuthor>
          </>
        ) : (
          <>
            <LinkToPost post={parent} /> to an anonymous user
          </>
        )}
      </Wrapper>
    )
  }

  if (AppBskyFeedDefs.isThreadViewPost(parent)) {
    const { post } = parent
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        {post.author ? (
          <>
            <LinkToPost post={parent.post} /> to{' '}
            <LinkToPostAuthor post={parent.post}>
              @{parent.post.author.handle}
            </LinkToPostAuthor>
          </>
        ) : (
          <>
            <LinkToPost post={parent.post} /> to an anonymous user
          </>
        )}
      </Wrapper>
    )
  }

  console.log('here', parent.$type)
  return null
}

const LinkToPost = ({
  children,
  post,
}: {
  children?: ReactNode
  post:
    | AppBskyFeedDefs.BlockedPost
    | AppBskyFeedDefs.NotFoundPost
    | AppBskyFeedDefs.PostView
}) => {
  const createLinkToActionPanel = useActionPanelLink()
  return (
    <Link className="underline" href={createLinkToActionPanel(`${post.uri}`)}>
      {children ?? 'Reply'}
    </Link>
  )
}

const LinkToPostAuthor = ({
  children,
  post,
}: {
  children?: ReactNode
  post: AppBskyFeedDefs.BlockedPost | AppBskyFeedDefs.PostView
}) => {
  const createLinkToActionPanel = useActionPanelLink()
  return (
    <Link href={createLinkToActionPanel(post.author.did)} className="underline">
      {children}
    </Link>
  )
}
