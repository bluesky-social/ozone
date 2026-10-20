import React, { useState } from 'react'
import type { AppBskyActorDefs } from '@atproto/api'
import { AtUri } from '@atproto/api'
import {
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
  HeartIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { getSupportProvider } from './providers'

export function ProfileLinks({
  links,
}: {
  links?: AppBskyActorDefs.ProfileLinkView[]
}) {
  const items = links?.flatMap((link) => {
    const url = parseHttpsUrl(link.url)
    return url ? [{ link, url }] : []
  })
  if (!items?.length) return null

  return (
    <ul aria-label="Profile links" className="mt-2 flex flex-wrap gap-1.5">
      {items.map(({ link, url }) => {
        const provider = getSupportProvider(url)
        const label =
          link.title ||
          (provider
            ? `Support on ${provider}`
            : url.hostname.replace(/^www\./, ''))
        const recordPath = getRecordPath(link.uri)
        const color = provider
          ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
          : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-100'

        return (
          <li
            key={link.uri}
            className={`flex max-w-full items-center rounded-full text-xs font-medium ${color}`}
          >
            <a
              href={`https://go.bsky.app/redirect?u=${encodeURIComponent(link.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={link.url}
              aria-label={`Open ${label}: ${link.url} (opens in a new tab)`}
              className="flex min-w-0 items-center gap-1 rounded-full px-2 py-1 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {provider ? (
                <HeartIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <LinkFavicon key={link.icon} src={link.icon} />
              )}
              <bdi className="truncate max-w-48">{label}</bdi>
              <ArrowTopRightOnSquareIcon
                className="h-3 w-3 shrink-0"
                aria-hidden="true"
              />
            </a>
            {recordPath && (
              <Link
                href={recordPath}
                title={`Review link: ${link.url}`}
                aria-label={`Review link: ${label}`}
                className="shrink-0 rounded-full p-1 mr-0.5 hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function LinkFavicon({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  return src && parseHttpsUrl(src) && !failed ? (
    // The AppView supplies a CDN image URL, not the destination site's favicon.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-3.5 w-3.5 shrink-0 rounded-sm"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <GlobeAltIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  )
}

function parseHttpsUrl(value: string): URL | undefined {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return url
  } catch {}
}

function getRecordPath(uri: string): string | undefined {
  try {
    const record = new AtUri(uri)
    if (
      record.host.startsWith('did:') &&
      record.collection === 'app.bsky.actor.link' &&
      record.rkey
    ) {
      return `/repositories/${encodeURIComponent(record.host)}/${record.collection}/${encodeURIComponent(record.rkey)}`
    }
  } catch {}
}
