import {
  AppBskyFeedPost as Post,
  RichText as RichTextProcessor,
} from '@atproto/api'
import Link from 'next/link'
import React from 'react'

export function RichText({ post }: { post: Post.Record }) {
  if (!post) {
    return null
  }

  const richtext = new RichTextProcessor(post)

  const els = [] as React.ReactNode[]
  for (const segment of richtext.segments()) {
    if (segment.isMention()) {
      els.push(
        <Link href={`/repositories/${segment.mention?.did}`}>
          {segment.text}
        </Link>,
      )
    } else if (segment.isLink()) {
      els.push(
        <a href={String(segment.link?.uri)} title={segment.text}>
          {toShortUrl(segment.text)}
        </a>,
      )
    } else {
      els.push(segment.text)
    }
  }
  return <div className='break-words'>{els}</div>
}

// This function was copy-pasted from social-app's RichText component
export function toShortUrl(url: string): string {
  try {
    const urlp = new URL(url)
    const shortened =
      urlp.host +
      (urlp.pathname === '/' ? '' : urlp.pathname) +
      urlp.search +
      urlp.hash
    if (shortened.length > 30) {
      return shortened.slice(0, 27) + '...'
    }
    return shortened
  } catch (e) {
    return url
  }
}
