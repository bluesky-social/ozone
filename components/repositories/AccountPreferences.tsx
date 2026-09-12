'use client'

import { AppBskyActorDefs } from '@atproto/api'
import {
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

import { LoadingFailedDense, LoadingDense } from '@/common/Loader'
import { useLabelerAgent } from '@/shell/ConfigurationContext'

const preferenceTitles: Record<string, string> = {
  adultContentPref: 'Adult content',
  contentLabelPref: 'Content filter',
  savedFeedsPref: 'Saved feeds',
  savedFeedsPrefV2: 'Saved feeds',
  personalDetailsPref: 'Personal details',
  declaredAgePref: 'Declared age',
  feedViewPref: 'Following feed',
  threadViewPref: 'Thread view',
  interestsPref: 'Interests',
  mutedWordsPref: 'Muted words',
  hiddenPostsPref: 'Hidden posts',
  bskyAppStatePref: 'Bluesky app',
  labelersPref: 'Moderation services',
  postInteractionSettingsPref: 'Post interactions',
  verificationPrefs: 'Verification',
  liveEventPreferences: 'Live events',
}

function preferenceName(type: string) {
  const name = type.split('#').at(-1) || type
  return preferenceTitles[name] || humanize(name)
}

function humanize(value: string) {
  const label = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

type PreferenceRow = {
  label: string
  value: unknown
}

function flattenPreference(
  value: unknown,
  path: string[] = [],
): PreferenceRow[] {
  if (Array.isArray(value)) {
    if (!value.length) {
      return [{ label: path.map(humanize).join(' · '), value: [] }]
    }
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return [{ label: path.map(humanize).join(' · '), value }]
    }
    return value.flatMap((item, index) =>
      flattenPreference(item, [...path, String(index + 1)]),
    )
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    const fields = entries.filter(([key]) => key !== '$type')
    if (!fields.length) {
      const type = entries.find(([key]) => key === '$type')?.[1]
      return [
        {
          label: path.map(humanize).join(' · '),
          value: typeof type === 'string' ? preferenceName(type) : [],
        },
      ]
    }
    return fields.flatMap(([key, nestedValue]) =>
      flattenPreference(nestedValue, [...path, key]),
    )
  }

  return [{ label: path.map(humanize).join(' · '), value }]
}

function PreferenceValue({ value }: { value: unknown }) {
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-700 dark:text-green-400' : ''}>
        {value ? 'Enabled' : 'Disabled'}
      </span>
    )
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">Not set</span>
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-gray-400">None</span>
    return <span className="break-words">{value.map(String).join(', ')}</span>
  }

  return <span className="break-words">{String(value)}</span>
}

type Preference = AppBskyActorDefs.Preferences[number]

function PreferenceTable({
  title,
  headers,
  rows,
}: {
  title: string
  headers: string[]
  rows: ReactNode[][]
}) {
  return (
    <section className="mb-5">
      <h5 className="mb-1.5 font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </h5>
      <div className="overflow-x-auto border-y border-gray-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-gray-400">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 align-top text-gray-900 dark:text-gray-200"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-3 py-2 text-gray-400"
                >
                  None
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PreferenceSection({
  type,
  preferences,
}: {
  type: string
  preferences: Preference[]
}) {
  const name = type.split('#').at(-1)
  const title = preferenceName(type)

  if (name === 'contentLabelPref') {
    const rows = preferences.map((preference) => {
      const item = preference as AppBskyActorDefs.ContentLabelPref
      return [
        item.label,
        humanize(item.visibility),
        item.labelerDid || 'All moderation services',
      ]
    })
    return (
      <PreferenceTable
        title="Content filters"
        headers={['Label', 'Visibility', 'Moderation service']}
        rows={rows}
      />
    )
  }

  if (name === 'savedFeedsPrefV2') {
    const rows = preferences.flatMap((preference) =>
      (preference as AppBskyActorDefs.SavedFeedsPrefV2).items.map((item) => [
        humanize(item.type),
        item.value,
        <PreferenceValue key="pinned" value={item.pinned} />,
      ]),
    )
    return (
      <PreferenceTable
        title={title}
        headers={['Type', 'Value', 'Pinned']}
        rows={rows}
      />
    )
  }

  if (name === 'savedFeedsPref') {
    const items = preferences.flatMap((preference) => {
      const item = preference as AppBskyActorDefs.SavedFeedsPref
      return Array.from(new Set([...item.saved, ...item.pinned])).map((value) => [
        value,
        item.saved.includes(value) ? 'Yes' : 'No',
        item.pinned.includes(value) ? 'Yes' : 'No',
      ])
    })
    return (
      <PreferenceTable
        title="Saved feeds (legacy)"
        headers={['Value', 'Saved', 'Pinned']}
        rows={items}
      />
    )
  }

  if (name === 'feedViewPref') {
    const rows = preferences.map((preference) => {
      const item = preference as AppBskyActorDefs.FeedViewPref
      return [
        item.feed,
        <PreferenceValue key="replies" value={item.hideReplies} />,
        <PreferenceValue key="reposts" value={item.hideReposts} />,
        <PreferenceValue key="quotes" value={item.hideQuotePosts} />,
        item.hideRepliesByLikeCount ?? 'Not set',
      ]
    })
    return (
      <PreferenceTable
        title={title}
        headers={[
          'Feed',
          'Hide replies',
          'Hide reposts',
          'Hide quotes',
          'Minimum likes',
        ]}
        rows={rows}
      />
    )
  }

  if (name === 'mutedWordsPref') {
    const rows = preferences.flatMap((preference) =>
      (preference as AppBskyActorDefs.MutedWordsPref).items.map((item) => [
        item.value,
        item.targets.map(humanize).join(', '),
        humanize(item.actorTarget),
        item.expiresAt ? new Date(item.expiresAt).toLocaleString() : 'Never',
      ]),
    )
    return (
      <PreferenceTable
        title={title}
        headers={['Word or phrase', 'Targets', 'Applies to', 'Expires']}
        rows={rows}
      />
    )
  }

  if (name === 'labelersPref') {
    const rows = preferences.flatMap((preference) =>
      (preference as AppBskyActorDefs.LabelersPref).labelers.map((item) => [
        item.did,
      ]),
    )
    return <PreferenceTable title={title} headers={['DID']} rows={rows} />
  }

  if (name === 'interestsPref') {
    const interests = preferences.flatMap(
      (preference) =>
        (preference as AppBskyActorDefs.InterestsPref).tags,
    )
    return (
      <PreferenceTable
        title={title}
        headers={['Interests']}
        rows={[[interests.length ? interests.join(', ') : 'None']]}
      />
    )
  }

  if (name === 'hiddenPostsPref') {
    const rows = preferences.flatMap((preference) =>
      (preference as AppBskyActorDefs.HiddenPostsPref).items.map((uri) => [uri]),
    )
    return <PreferenceTable title={title} headers={['Post URI']} rows={rows} />
  }

  const rows = preferences.flatMap((preference, preferenceIndex) =>
    flattenPreference(preference).map((row) => [
      preferences.length > 1
        ? `${preferenceIndex + 1} · ${row.label || 'Value'}`
        : row.label || 'Value',
      <PreferenceValue
        key={`${preferenceIndex}-${row.label}`}
        value={row.value}
      />,
    ]),
  )
  return (
    <PreferenceTable title={title} headers={['Setting', 'Value']} rows={rows} />
  )
}

export function AccountPreferences({ did }: { did: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const labelerAgent = useLabelerAgent()
  const { data, error, isLoading } = useQuery({
    queryKey: ['accountPreferences', { did }],
    enabled: isOpen,
    cacheTime: 1000 * 60 * 5,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ did })
      const response = await labelerAgent.fetchHandler(
        `/xrpc/tools.ozone.moderation.getAccountPreferences?${params}`,
        {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal,
        },
      )
      const body = await response.text()
      let data: {
        error?: string
        message?: string
        preferences?: AppBskyActorDefs.Preferences
      } = {}
      try {
        if (body) data = JSON.parse(body)
      } catch {
        // Fall through to the status-based error for non-JSON responses.
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Failed to load preferences (HTTP ${response.status})`,
        )
      }
      if (!data.preferences) {
        throw new Error('Preferences response is missing preferences')
      }

      return { preferences: data.preferences }
    },
  })

  return (
    <section className="mb-6" aria-labelledby="account-preferences-heading">
      <button
        type="button"
        className="mb-2 flex items-center font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-50 dark:hover:text-white"
        aria-expanded={isOpen}
        aria-controls="account-preferences-content"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <ChevronDownIcon className="mr-1 h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronRightIcon className="mr-1 h-4 w-4" aria-hidden="true" />
        )}
        <span id="account-preferences-heading">User Preferences</span>
      </button>

      {isOpen && (
        <div id="account-preferences-content">
          {isLoading ? (
            <LoadingDense />
          ) : error ? (
            <div className="rounded-lg border border-red-200 p-3 text-red-700 dark:border-red-900 dark:text-red-300">
              <LoadingFailedDense error={error} noPadding />
            </div>
          ) : !data?.preferences.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No user preferences found.
            </p>
          ) : (
            Array.from(
              data.preferences.reduce((sections, preference) => {
                const type = preference.$type || 'unknownPreference'
                sections.set(type, [...(sections.get(type) || []), preference])
                return sections
              }, new Map<string, Preference[]>()),
            ).map(([type, preferences]) => (
              <PreferenceSection
                key={type}
                type={type}
                preferences={preferences}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}
