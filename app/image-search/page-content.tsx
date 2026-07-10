'use client'

import {
  CheckCircleIcon,
  LinkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useTitle } from 'react-use'

import { Alert } from '@/common/Alert'
import { ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { CopyButton, copyToClipboard } from '@/common/CopyButton'
import { EmptyDataset } from '@/common/feeds/EmptyFeed'
import { FormLabel, Input, Select } from '@/common/forms'
import { Loading } from '@/common/Loader'
import { useWorkspaceOpener } from '@/common/useWorkspaceOpener'
import {
  ImageSearchInput,
  ImageSearchMatch,
  ImageSearchOptions,
  useImageSearch,
} from '@/lib/useImageSearch'
import {
  ActionPanelNames,
  hydrateModToolInfo,
  useEmitEvent,
} from '@/mod-event/helpers/emitEvent'
import {
  useWorkspaceAddItemsMutation,
  useWorkspaceList,
} from '@/workspace/hooks'
import { WorkspacePanel } from '@/workspace/Panel'
import { ToolsOzoneModerationEmitEvent } from '@atproto/api'
import { ModActionPanelQuick } from 'app/actions/ModActionPanel/QuickAction'

const HASH_RE = /^[0-9a-f]{64}$/i
const PAGE_SIZES = [10, 25, 50, 100]

function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input.trim())
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const DEFAULT_THRESHOLD = 31
const DEFAULT_LOOKBACK_DAYS = 7

const THRESHOLD_PRESETS = [
  { label: 'Exact', value: 10, description: 'Near-identical images only' },
  { label: 'Close', value: 31, description: 'Visually similar variants' },
  { label: 'Broad', value: 50, description: 'Loosely similar images' },
] as const

// parseIntParam reads an integer query param, falling back to a default when
// absent or unparseable.
function parseIntParam(raw: string | null, fallback: number): number {
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) ? n : fallback
}

export const ImageSearchPageContent = () => {
  useTitle('Image Search')

  const search = useImageSearch()
  const emitEvent = useEmitEvent()
  const { mutate: addToWorkspace } = useWorkspaceAddItemsMutation()
  const { data: workspaceList } = useWorkspaceList()
  const { toggleWorkspacePanel, isWorkspaceOpen } = useWorkspaceOpener()
  const workspaceItems = useMemo(
    () => new Set(workspaceList ?? []),
    [workspaceList],
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Quick action panel
  const quickOpenParam = searchParams.get('quickOpen') ?? ''
  const setQuickActionPanelSubject = (subject: string) => {
    const newParams = new URLSearchParams(document.location.search)
    if (!subject) {
      newParams.delete('quickOpen')
    } else {
      newParams.set('quickOpen', subject)
    }
    router.push((pathname ?? '') + '?' + newParams.toString())
  }

  // text input - can be hash or image URL
  const [text, setText] = useState(
    () => searchParams.get('hash') ?? searchParams.get('url') ?? '',
  )
  // file input
  const [file, setFile] = useState<File | null>(null)

  // Controls — also seeded from the URL.
  const [threshold, setThreshold] = useState(() =>
    parseIntParam(searchParams.get('threshold'), DEFAULT_THRESHOLD),
  )
  const [lookbackDays, setLookbackDays] = useState(() =>
    parseIntParam(searchParams.get('lookbackDays'), DEFAULT_LOOKBACK_DAYS),
  )

  // Results paging
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const result = search.data
  const isSearching = search.isPending

  // Validation error shown on submit (e.g. nothing entered, or a malformed
  // hash). Cleared as soon as the inputs change so it doesn't linger.
  const [formError, setFormError] = useState<string | null>(null)
  useEffect(() => {
    setFormError(null)
  }, [text, file])

  const hashValid = HASH_RE.test(text.trim())
  const urlValid = isValidUrl(text)
  const inputValid = hashValid || urlValid

  // Write the current inputs to the URL
  const syncUrl = (params: URLSearchParams) => {
    params.set('threshold', String(threshold))
    params.set('lookbackDays', String(lookbackDays))
    router.replace(`${pathname ?? ''}?${params.toString()}`)
  }

  const runSearch = () => {
    const options: ImageSearchOptions = {
      threshold,
      lookbackDays,
    }
    if (file) {
      // File searches can't be shared via URL; clear any stale params.
      router.replace(pathname ?? '')
      search.mutate({ image: file, options })
      return
    }
    const trimmed = text.trim()
    const params = new URLSearchParams()
    let input: ImageSearchInput
    if (urlValid) {
      params.set('url', trimmed)
      input = { url: trimmed, options }
    } else {
      const h = trimmed.toLowerCase()
      params.set('hash', h)
      input = { hash: h, options }
    }
    syncUrl(params)
    search.mutate(input)
  }

  const shareSearch = () => {
    if (!result?.query) return
    const params = new URLSearchParams()
    params.set('hash', result.query)
    syncUrl(params)
    const shareUrl = `${window.location.origin}${
      pathname ?? ''
    }?${params.toString()}`
    copyToClipboard(shareUrl, 'share link ')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isSearching) return

    // Validate: need a hash, an image URL, or a file, and text input must be
    // one of the two recognized forms.
    if (!text.trim() && !file) {
      setFormError('Enter a PDQ hash, image URL, or upload an image to search.')
      return
    }
    if (!file && !inputValid) {
      setFormError(`Enter a 64-character hex PDQ hash or an https image URL.`)
      return
    }

    setFormError(null)
    runSearch()
  }

  const matches = useMemo(() => {
    if (!result) return []
    return result.matches
  }, [result])

  // Reset to the first page whenever the visible match set changes
  useEffect(() => {
    setPage(0)
  }, [matches])

  const uniqueAccounts = useMemo(
    () => new Set(matches.map((m) => m.did).filter(Boolean)).size,
    [matches],
  )

  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
  const pagedMatches = useMemo(
    () => matches.slice(page * pageSize, page * pageSize + pageSize),
    [matches, page, pageSize],
  )

  const addMatchesToWorkspace = () => {
    const subjects = [...new Set(matches.map((m) => m.uri).filter(Boolean))]
    if (subjects.length === 0) return
    addToWorkspace(subjects)
    if (!isWorkspaceOpen) toggleWorkspacePanel()
  }

  const addMatchToWorkspace = (uri: string) => {
    if (!uri) return
    addToWorkspace([uri])
  }

  return (
    <div className="w-11/12 lg:w-5/6 mx-auto my-4 dark:text-gray-100">
      <h4 className="font-medium text-gray-700 dark:text-gray-100 mb-2">
        Image Search
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
        Find images across the network whose perceptual hash matches the
        provided hash, file, or image URL.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormLabel label="PDQ hash or image URL" htmlFor="pdq-hash">
          <Input
            id="pdq-hash"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={`64-character hex PDQ hash or https://example.com/... image URL`}
            value={text}
            disabled={!!file}
            onChange={(e) => setText(e.target.value)}
            className="w-full font-mono"
          />
          {text.length > 0 && !inputValid && (
            <p className="text-xs text-red-500 mt-1">
              Must be a 64-character hex string or an https image URL.
            </p>
          )}
        </FormLabel>

        <div className="text-center text-xs text-gray-400">— or —</div>

        <FormLabel label="Image" htmlFor="search-image">
          <input
            id="search-image"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-indigo-50 dark:file:bg-slate-700 file:px-3 file:py-1 file:text-sm file:font-medium"
          />
          {file && (
            <button
              type="button"
              className="text-xs text-indigo-600 dark:text-teal-400 mt-1"
              onClick={() => setFile(null)}
            >
              Clear image
            </button>
          )}
        </FormLabel>

        <FormLabel label="Match threshold" htmlFor="threshold">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            {THRESHOLD_PRESETS.map((preset) => {
              const selected = threshold === preset.value
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setThreshold(preset.value)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 dark:border-teal-500 dark:bg-slate-700'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-teal-600'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">
                      {preset.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      &le;{preset.value}
                    </span>
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {preset.description}
                  </span>
                </button>
              )
            })}
          </div>
          <Input
            id="threshold"
            type="number"
            min={0}
            max={256}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
        </FormLabel>

        <FormLabel label="Lookback (days)" htmlFor="lookback">
          <Input
            id="lookback"
            type="number"
            min={1}
            max={365}
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="w-full"
          />
        </FormLabel>

        <div className="flex flex-row gap-2">
          <ButtonPrimary type="submit" disabled={isSearching}>
            Search
          </ButtonPrimary>
          {isSearching && (
            <ButtonSecondary type="button" onClick={() => search.cancel()}>
              Cancel
            </ButtonSecondary>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-500">
            {formError}
          </p>
        )}
      </form>

      <div className="mt-6">
        {isSearching && <Loading message="Searching…" />}

        {!isSearching && result === null && (
          <Alert
            type="warning"
            showIcon
            title="Image search unavailable"
            body="The search backend is not configured or could not be reached."
          />
        )}

        {!isSearching && result && (
          <>
            {result.query && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 break-all">
                <span className="font-medium">PDQ hash:</span>
                <code className="font-mono">{result.query}</code>
                <CopyButton
                  text={result.query}
                  label="PDQ hash"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                />
              </div>
            )}
            <ImageSearchResults
              total={result.total}
              shown={matches.length}
              uniqueAccounts={uniqueAccounts}
              matches={pagedMatches}
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(0)
              }}
              onAddAllToWorkspace={addMatchesToWorkspace}
              onShare={shareSearch}
              onOpenQuickAction={setQuickActionPanelSubject}
              workspaceItems={workspaceItems}
              onAddToWorkspace={addMatchToWorkspace}
            />
          </>
        )}
      </div>

      <WorkspacePanel
        open={isWorkspaceOpen}
        onClose={() => toggleWorkspacePanel()}
      />

      <ModActionPanelQuick
        open={!!quickOpenParam}
        onClose={() => setQuickActionPanelSubject('')}
        setSubject={setQuickActionPanelSubject}
        subject={quickOpenParam}
        subjectOptions={[quickOpenParam]}
        isInitialLoading={false}
        onSubmit={async (vals: ToolsOzoneModerationEmitEvent.InputSchema) => {
          await emitEvent(
            hydrateModToolInfo(vals, ActionPanelNames.QuickAction),
          )
        }}
      />
    </div>
  )
}

function ImageSearchResults({
  total,
  shown,
  uniqueAccounts,
  matches,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onAddAllToWorkspace,
  onShare,
  onOpenQuickAction,
  workspaceItems,
  onAddToWorkspace,
}: {
  total: number
  shown: number
  uniqueAccounts: number
  matches: ImageSearchMatch[]
  page: number
  pageCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onAddAllToWorkspace: () => void
  onShare: () => void
  onOpenQuickAction: (subject: string) => void
  workspaceItems: Set<string>
  onAddToWorkspace: (uri: string) => void
}) {
  if (total === 0) {
    return (
      <EmptyDataset message="No matches found">
        <PhotoIcon className="h-8 w-8" />
      </EmptyDataset>
    )
  }

  return (
    <div>
      <div className="flex flex-row flex-wrap justify-between items-center gap-2 mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Showing {shown} of {total} match{total === 1 ? '' : 'es'}
          {shown > 0 && (
            <span>
              {' '}
              ({uniqueAccounts} unique account{uniqueAccounts === 1 ? '' : 's'})
            </span>
          )}
          .
        </p>
        <div className="flex flex-row gap-2">
          <ButtonSecondary
            className="text-xs py-1"
            onClick={onShare}
            title="Copy a shareable link for this search"
          >
            <LinkIcon className="h-3 w-3 mr-1" />
            Share
          </ButtonSecondary>
          <ButtonSecondary
            className="text-xs py-1"
            onClick={onAddAllToWorkspace}
            disabled={shown === 0}
          >
            Add all to workspace
          </ButtonSecondary>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4">Distance</th>
              <th className="py-2 pr-4">Account</th>
              <th className="py-2 pr-4">Post text</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Workspace</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <ImageSearchResultRow
                key={`${m.uri}:${m.matchedHash}`}
                match={m}
                onOpenQuickAction={onOpenQuickAction}
                inWorkspace={!!m.uri && workspaceItems.has(m.uri)}
                onAddToWorkspace={onAddToWorkspace}
              />
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex flex-row flex-wrap items-center justify-between gap-2 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <ButtonSecondary
              className="text-xs py-1"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0}
            >
              Previous
            </ButtonSecondary>
            <span className="text-gray-500 dark:text-gray-400">
              Page {page + 1} of {pageCount}
            </span>
            <ButtonSecondary
              className="text-xs py-1"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount - 1}
            >
              Next
            </ButtonSecondary>
          </div>
          <label className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            Per page
            <Select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}
    </div>
  )
}

function ImageSearchResultRow({
  match,
  onOpenQuickAction,
  inWorkspace,
  onAddToWorkspace,
}: {
  match: ImageSearchMatch
  onOpenQuickAction: (subject: string) => void
  inWorkspace: boolean
  onAddToWorkspace: (uri: string) => void
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 align-top">
      <td className="py-2 pr-4 font-mono">{match.distance}</td>
      <td className="py-2 pr-4">
        <div className="flex items-center gap-1">
          {match.did ? (
            <button
              type="button"
              onClick={() => onOpenQuickAction(match.did)}
              className="text-left text-indigo-600 dark:text-teal-400 hover:underline break-all"
            >
              {match.did}
            </button>
          ) : (
            <span className="break-all">{match.did}</span>
          )}
          {match.did && (
            <CopyButton
              text={match.did}
              label="DID"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
            />
          )}
        </div>
      </td>
      <td className="py-2 pr-4 max-w-xs">
        {match.postText ? (
          <span className="text-gray-600 dark:text-gray-300 line-clamp-3 break-words">
            {match.postText}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">No text</span>
        )}
      </td>
      <td className="py-2 pr-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
        {match.timestamp ? new Date(match.timestamp).toLocaleString() : '—'}
      </td>
      <td className="py-2 pr-4 whitespace-nowrap">
        {!match.uri ? (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        ) : inWorkspace ? (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            Added
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onAddToWorkspace(match.uri)}
            className="text-indigo-600 dark:text-teal-400 hover:underline"
          >
            Add
          </button>
        )}
      </td>
      <td className="py-2 pr-4">
        <div className="flex flex-col gap-1">
          {match.uri && (
            <button
              type="button"
              onClick={() => onOpenQuickAction(match.uri)}
              className="text-left text-indigo-600 dark:text-teal-400 hover:underline"
            >
              Open in Panel
            </button>
          )}
          {match.uri && (
            <CopyButton
              text={match.uri}
              label="URI"
              className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            />
          )}
        </div>
      </td>
    </tr>
  )
}
