import React from 'react'
import { isDatetimeString } from '@atproto/syntax'
import {
  ArrowTopRightOnSquareIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import { CopyButton } from '../CopyButton'

// The link lexicon is still a draft. Read defensively so malformed records
// remain reviewable, including raw Aether snapshots without an ozoneValue.
export function ProfileLinkCard({ value }: { value: unknown }) {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const destination = typeof record.uri === 'string' ? record.uri : null
  const title = typeof record.title === 'string' ? record.title : null
  const createdAt =
    typeof record.createdAt === 'string' ? record.createdAt : null
  const validDate = isDatetimeString(createdAt)

  let url: URL | null = null
  try {
    if (destination && /^https?:\/\//i.test(destination)) {
      const parsed = new URL(destination)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        url = parsed
      }
    }
  } catch {
    // Keep the submitted URL visible even when it cannot be opened.
  }

  const warnings: string[] = []
  if (!url) warnings.push('Missing or invalid HTTP(S) URL.')
  if (url?.protocol === 'http:') {
    warnings.push('Uses unencrypted HTTP.')
  }
  if (url?.username || url?.password) {
    warnings.push('URL contains credentials. Check the destination hostname.')
  }
  if (url?.hostname.split('.').some((part) => part.startsWith('xn--'))) {
    warnings.push('Internationalized domain. Check the ASCII hostname below.')
  }
  if (!validDate) warnings.push('Missing or invalid creation time.')
  if (record.title !== undefined && title === null) {
    warnings.push('Invalid link title.')
  }

  return (
    <article
      aria-label="Profile link"
      className="bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-200"
    >
      <div className="flex items-start gap-2 mb-2">
        <LinkIcon className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words whitespace-pre-wrap">
            <bdi>{title || 'Untitled link'}</bdi>
          </p>
        </div>
        {url && (
          <a
            href={url.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 shrink-0 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open URL
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </div>
      {warnings.length > 0 && (
        <ul className="mb-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <dl className="space-y-1 text-xs">
        <LinkDetail
          label="URL"
          text={destination ?? 'Missing or invalid URL'}
          copy={!!destination}
        />
        {url && <LinkDetail label="Hostname" text={url.hostname} copy />}
        {url?.port && <LinkDetail label="Port" text={url.port} />}
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
          <dt className="text-xs text-gray-500 dark:text-gray-400">
            Created at
          </dt>
          <dd className="break-all">
            {validDate ? (
              <time dateTime={createdAt!}>{createdAt}</time>
            ) : (
              (createdAt ?? 'Not provided')
            )}
          </dd>
        </div>
      </dl>
    </article>
  )
}

function LinkDetail({
  label,
  text,
  copy = false,
}: {
  label: string
  text: string
  copy?: boolean
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="flex min-w-0 items-start gap-1">
        <span
          className="min-w-0 break-all font-mono text-xs whitespace-pre-wrap"
          dir="ltr"
        >
          {text}
        </span>
        {copy && (
          <CopyButton
            text={text}
            labelText={`${label.toLowerCase()} `}
            aria-label={`Copy ${label.toLowerCase()}`}
            title={`Copy ${label.toLowerCase()}`}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          />
        )}
      </dd>
    </div>
  )
}
