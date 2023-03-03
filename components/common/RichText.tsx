import { AppBskyFeedPost as Post } from '@atproto/api'
import Link from 'next/link'
import React from 'react'

export function RichText({ richText }: { richText: Post.Record }) {
  if (!richText) {
    return null
  }

  const { text, entities } = richText
  if (!entities?.length) {
    return <div>{text}</div>
  }

  entities.sort(sortByIndex)
  const segments = Array.from(toSegments(text, entities))
  const els = [] as React.ReactNode[]
  for (const segment of segments) {
    if (typeof segment === 'string') {
      els.push(segment)
    } else {
      if (segment.entity.type === 'mention') {
        els.push(
          <Link href={`/repositories/${segment.text?.replace('@', '')}`}>
            {segment.text}
          </Link>,
        )
      } else if (segment.entity.type === 'link') {
        els.push(<a href={segment.text}>{toShortUrl(segment.text)}</a>)
      }
    }
  }
  return <div>{els}</div>
}

// This  function was copy-pasted from social-app's RichText component
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

// This  function was copy-pasted from social-app's RichText component
function sortByIndex(a: Post.Entity, b: Post.Entity) {
  return a.index.start - b.index.start
}

// This  function was copy-pasted from social-app's RichText component
function* toSegments(text: string, entities: Post.Entity[]) {
  let cursor = 0
  let i = 0
  do {
    let currEnt = entities[i]
    if (cursor < currEnt.index.start) {
      yield text.slice(cursor, currEnt.index.start)
    } else if (cursor > currEnt.index.start) {
      i++
      continue
    }
    if (currEnt.index.start < currEnt.index.end) {
      let subtext = text.slice(currEnt.index.start, currEnt.index.end)
      if (!subtext.trim()) {
        // dont yield links to empty strings
        yield subtext
      } else {
        yield {
          entity: currEnt,
          text: subtext,
        }
      }
    }
    cursor = currEnt.index.end
    i++
  } while (i < entities.length)
  if (cursor < text.length) {
    yield text.slice(cursor, text.length)
  }
}
