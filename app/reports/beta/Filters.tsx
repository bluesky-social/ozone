'use client'
import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Checkbox } from '@/common/forms'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { CollectionId, getCollectionName } from '@/reports/helpers/subject'
import { ReportStatuses } from '@/reports/constants'
import { useAuthDid } from '@/shell/AuthContext'

const STATUS_OPTIONS = [
  { id: 'all', text: 'All Statuses', value: '' },
  { id: ReportStatuses.OPEN, text: 'Open', value: ReportStatuses.OPEN },
  { id: ReportStatuses.CLOSED, text: 'Closed', value: ReportStatuses.CLOSED },
  {
    id: ReportStatuses.ESCALATED,
    text: 'Escalated',
    value: ReportStatuses.ESCALATED,
  },
  { id: ReportStatuses.QUEUED, text: 'Queued', value: ReportStatuses.QUEUED },
  {
    id: ReportStatuses.ASSIGNED,
    text: 'Assigned',
    value: ReportStatuses.ASSIGNED,
  },
]

const MUTED_OPTIONS = [
  { id: 'unmuted', text: 'Unmuted', value: '' },
  { id: 'muted', text: 'Muted', value: 'isMuted' },
  { id: 'all', text: 'All', value: 'all' },
]

const SUBJECT_TYPE_OPTIONS = [
  { id: 'all', text: 'All Subject Types', value: '' },
  { id: 'account', text: 'Account', value: 'account' },
  { id: 'record', text: 'Record', value: 'record' },
]

function useFiltersUpdater() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const updateParam = useCallback(
    (updates: Record<string, string | string[] | undefined>) => {
      const nextParams = new URLSearchParams(params)
      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === undefined ||
          (Array.isArray(value) && value.length === 0)
        ) {
          nextParams.delete(key)
        } else if (Array.isArray(value)) {
          nextParams.set(key, value.join(','))
        } else {
          nextParams.set(key, value)
        }
      })
      router.replace(`${pathname}?${nextParams.toString()}`)
    },
    [params, pathname, router],
  )

  return updateParam
}

export function BetaReportsFilters() {
  const params = useSearchParams()
  const updateParam = useFiltersUpdater()

  const mute = params.get('mute') ?? ''

  const selectBase =
    'text-xs rounded border border-gray-300 dark:border-gray-600 px-2 py-1 appearance-none cursor-pointer'
  const selectDefault =
    'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
  const selectActive =
    'bg-rose-50 dark:bg-teal-900/40 text-rose-700 dark:text-teal-200 font-medium'
  const status = params.get('status') ?? ReportStatuses.QUEUED
  const subjectType = params.get('subjectType') ?? ''
  const collections =
    params.get('collections')?.split(',').filter(Boolean) ?? []
  const reportTypes =
    params.get('reportTypes')?.split(',').filter(Boolean) ?? []

  const setMute = (value: string) => updateParam({ mute: value || undefined })

  const setStatus = (value: string) =>
    updateParam({ status: value === ReportStatuses.QUEUED ? undefined : value })

  const setSubjectType = (value: string) => {
    if (value === subjectType) {
      updateParam({ subjectType: undefined, collections: undefined })
    } else if (value === 'account') {
      updateParam({ subjectType: 'account', collections: undefined })
    } else {
      updateParam({ subjectType: value || undefined })
    }
  }

  const toggleCollection = (collectionId: string) => {
    const next = new Set(collections)
    if (next.has(collectionId)) {
      next.delete(collectionId)
    } else {
      next.add(collectionId)
    }
    updateParam({ collections: next.size > 0 ? Array.from(next) : undefined })
  }

  const setReportTypes = (values: string[]) =>
    updateParam({ reportTypes: values.length > 0 ? values : undefined })

  const currentUserDid = useAuthDid()
  const assignedTo = params.get('assignedTo') ?? ''

  const toggleMyAssignments = () =>
    updateParam({
      assignedTo: assignedTo ? undefined : currentUserDid,
      status: 'assigned',
    })

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Status */}
        <select
          className={`${selectBase} ${status !== ReportStatuses.QUEUED ? selectActive : selectDefault}`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.text}
            </option>
          ))}
        </select>

        {/* Muted */}
        <select
          className={`${selectBase} ${mute !== '' ? selectActive : selectDefault}`}
          value={mute}
          onChange={(e) => setMute(e.target.value)}
        >
          {MUTED_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.text}
            </option>
          ))}
        </select>

        {/* Subject type */}
        <select
          className={`${selectBase} ${subjectType !== '' ? selectActive : selectDefault}`}
          value={subjectType}
          onChange={(e) => setSubjectType(e.target.value)}
        >
          {SUBJECT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.text}
            </option>
          ))}
        </select>

        {/* My Assignments */}
        <button
          type="button"
          className={`${selectBase} ${assignedTo ? selectActive : selectDefault}`}
          onClick={toggleMyAssignments}
        >
          My Assignments
        </button>

        {/* Report types */}
        <ReportTypeMultiselect
          value={reportTypes}
          onChange={setReportTypes}
          className="w-fit flex items-start gap-3"
        />
      </div>

      {/* Collections row — only when subject type is record */}
      {subjectType === 'record' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-px">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Collections
          </span>
          {Object.values(CollectionId).map((id) => (
            <Checkbox
              key={id}
              className="flex items-center"
              label={getCollectionName(id)}
              value={id}
              checked={collections.includes(id)}
              onChange={() => toggleCollection(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
