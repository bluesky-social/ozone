'use client'
import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ButtonGroup } from '@/common/buttons'
import { Checkbox } from '@/common/forms'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import {
  CollectionId,
  getCollectionName,
} from '@/reports/helpers/subject'
import { ReportStatuses } from '@/reports/constants'

const STATUS_OPTIONS = [
  { id: 'all', text: 'All', value: '' },
  { id: ReportStatuses.OPEN, text: 'Open', value: ReportStatuses.OPEN },
  { id: ReportStatuses.CLOSED, text: 'Closed', value: ReportStatuses.CLOSED },
  {
    id: ReportStatuses.ESCALATED,
    text: 'Escalated',
    value: ReportStatuses.ESCALATED,
  },
]

const MUTED_OPTIONS = [
  { id: 'unmuted', text: 'Unmuted', value: 'false' },
  { id: 'muted', text: 'Muted', value: 'true' },
  { id: 'all', text: 'All', value: '' },
]

const SUBJECT_TYPE_OPTIONS = [
  { id: 'all', text: 'All', value: '' },
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
        if (value === undefined || (Array.isArray(value) && value.length === 0)) {
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

  const isMuted = params.get('isMuted') ?? ''
  const status = params.get('status') ?? ''
  const subjectType = params.get('subjectType') ?? ''
  const collections =
    params.get('collections')?.split(',').filter(Boolean) ?? []
  const reportTypes =
    params.get('reportTypes')?.split(',').filter(Boolean) ?? []

  const setIsMuted = (value: string) =>
    updateParam({ isMuted: value || undefined })

  const setStatus = (value: string) =>
    updateParam({ status: value || undefined })

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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Status
          </span>
          <ButtonGroup
            size="xs"
            appearance="primary"
            items={STATUS_OPTIONS.map((opt) => ({
              id: opt.id,
              text: opt.text,
              isActive: status === opt.value,
              onClick: () => setStatus(opt.value),
            }))}
          />
        </div>

        {/* Muted */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Muted
          </span>
          <ButtonGroup
            size="xs"
            appearance="primary"
            items={MUTED_OPTIONS.map((opt) => ({
              id: opt.id,
              text: opt.text,
              isActive: (isMuted || 'false') === opt.value,
              onClick: () => setIsMuted(opt.value),
            }))}
          />
        </div>

        {/* Subject type */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Subject
          </span>
          <ButtonGroup
            size="xs"
            appearance="primary"
            items={SUBJECT_TYPE_OPTIONS.map((opt) => ({
              id: opt.id,
              text: opt.text,
              isActive: subjectType === opt.value,
              onClick: () => setSubjectType(opt.value),
            }))}
          />
        </div>

        {/* Report types */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Report Types
          </span>
          <div className="w-56">
            <ReportTypeMultiselect
              value={reportTypes}
              onChange={setReportTypes}
            />
          </div>
        </div>
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
