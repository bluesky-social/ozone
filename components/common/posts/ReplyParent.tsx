import { AppBskyActorDefs, AppBskyFeedDefs } from '@atproto/api'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export const ReplyParent = ({
  reply,
  inline = false,
}: {
  reply: AppBskyFeedDefs.ReplyRef
  inline?: boolean
}) => {
  const parent = reply.parent
  const Wrapper = inline ? 'span' : 'p'
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createLinkToActionPanel = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)

      return `${pathname}?${params.toString()}`
    },
    [searchParams, pathname],
  )

  if (!parent) return null

  if (parent.notFound) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        Reply to{' '}
        <Link
          className="underline"
          href={createLinkToActionPanel('quickOpen', `${parent.uri}`)}
        >
          a deleted post
        </Link>
      </Wrapper>
    )
  }

  const parentAuthor = parent.author as AppBskyActorDefs.ProfileViewBasic

  if (!parentAuthor) {
    return (
      <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
        Reply to{' '}
        <Link
          className="underline"
          href={createLinkToActionPanel('quickOpen', `${parent.uri}`)}
        >
          an anonymous post
        </Link>
      </Wrapper>
    )
  }

  return (
    <Wrapper className="text-gray-500 dark:text-gray-50 text-sm">
      Reply to{' '}
      <Link
        href={`/repositories/${parentAuthor.did}`}
        className="hover:underline"
      >
        @{parentAuthor.handle}
      </Link>
    </Wrapper>
  )
}
