import { useEffect, useState } from 'react'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { ActionButton } from '@/common/buttons'
import { Input, Textarea, FormLabel, Checkbox } from '@/common/forms'
import { useCreateQueue, useUpdateQueue } from './useQueues'
import { StringList } from '@/common/StringList'

function MatchSummary({
  subjectTypes,
  collection,
  reportTypesText,
}: {
  subjectTypes: Set<string>
  collection: string | undefined
  reportTypesText: string
}) {
  const reportTypes = reportTypesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (subjectTypes.size === 0 || reportTypes.length === 0)
    return (
      <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-900 dark:text-yellow-200">
        No reports will match this queue.
      </div>
    )

  const subjectList = Array.from(subjectTypes)
  const _collection = collection?.trim() || undefined

  return (
    <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-900 dark:text-blue-200">
      <p className="font-medium mb-2">
        A report will be routed to this queue when <strong>all</strong> of the
        following match:
      </p>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          Subject type is <StringList items={subjectList} conjunction="or" />
        </li>
        {_collection && (
          <li>
            Collection is <strong>{_collection}</strong>
          </li>
        )}
        <li>
          Report type is <StringList items={reportTypes} conjunction="or" />
        </li>
      </ul>
    </div>
  )
}

export function QueueForm({
  queue,
  onCancel,
  onSuccess,
}: {
  queue?: ToolsOzoneQueueDefs.QueueView
  onCancel: () => void
  onSuccess: () => void
}) {
  const isEditMode = !!queue
  const createMutation = useCreateQueue()
  const updateMutation = useUpdateQueue()
  const isPending = createMutation.isPending || updateMutation.isPending

  // form
  const [name, setName] = useState(queue?.name ?? '')
  const [enabled, setEnabled] = useState(queue?.enabled ?? true)
  const [subjectTypes, setSubjectTypes] = useState<Set<string>>(
    new Set(queue?.subjectTypes ?? []),
  )
  const [collection, setCollection] = useState<string | undefined>(
    queue?.collection?.trim() || undefined,
  )
  const [reportTypesText, setReportTypesText] = useState(
    queue?.reportTypes.join(', ') ?? '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleSubjectType = (type: string) => {
    setSubjectTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!isEditMode) {
      if (subjectTypes.size === 0) {
        newErrors.subjectTypes = 'At least one subject type is required'
      }

      const reportTypes = reportTypesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (reportTypes.length === 0) {
        newErrors.reportTypes = 'At least one report type is required'
      } else if (reportTypes.length > 25) {
        newErrors.reportTypes = 'Maximum 25 report types allowed'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    if (isEditMode && queue) {
      await updateMutation.mutateAsync(
        {
          queueId: queue.id,
          ...(name !== queue.name ? { name } : {}),
          ...(enabled !== queue.enabled ? { enabled } : {}),
        },
        { onSuccess },
      )
    } else {
      const reportTypes = reportTypesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const _collection = subjectTypes.has('record')
        ? collection?.trim()
        : undefined

      await createMutation.mutateAsync(
        {
          name,
          subjectTypes: Array.from(subjectTypes),
          reportTypes,
          collection: _collection,
        },
        { onSuccess },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormLabel label="Name" htmlFor="queue-name" required className="mb-3">
        <Input
          type="text"
          id="queue-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Queue name"
          className="block w-full"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </FormLabel>

      {isEditMode && (
        <Checkbox
          id="queue-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          label={'Enable'}
        />
      )}

      {!isEditMode && (
        <>
          <FormLabel label="Subject Type(s)" required>
            <div className="flex flex-col gap-2">
              <Checkbox
                key="account"
                id="subject-type-account"
                checked={subjectTypes.has('account')}
                onChange={() => toggleSubjectType('account')}
                label="account"
              />
              <Checkbox
                key="record"
                id="subject-type-record"
                checked={subjectTypes.has('record')}
                onChange={() => toggleSubjectType('record')}
                label="record"
              />
              <Checkbox
                key="message"
                id="subject-type-message"
                checked={subjectTypes.has('message')}
                onChange={() => toggleSubjectType('message')}
                label="message"
              />
            </div>
            {errors.subjectTypes && (
              <p className="text-red-500 text-xs mt-1">{errors.subjectTypes}</p>
            )}
          </FormLabel>

          <FormLabel
            label="Report Type(s)"
            htmlFor="queue-report-types"
            required
            className="mb-3"
          >
            <Textarea
              id="queue-report-types"
              value={reportTypesText}
              onChange={(e) => setReportTypesText(e.target.value)}
              placeholder="tools.ozone.report.defs#reasonSpam"
              className="block w-full"
              rows={3}
            />
            {errors.reportTypes && (
              <p className="text-red-500 text-xs mt-1">{errors.reportTypes}</p>
            )}
          </FormLabel>

          {subjectTypes.has('record') && (
            <FormLabel
              label="Collection"
              htmlFor="queue-collection"
              className="mb-3"
            >
              <Input
                type="text"
                id="queue-collection"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="e.g. app.bsky.feed.post"
                className="block w-full"
              />
            </FormLabel>
          )}
        </>
      )}
      <MatchSummary
        subjectTypes={subjectTypes}
        collection={collection}
        reportTypesText={reportTypesText}
      />
      <div className="flex gap-2 pt-2">
        <ActionButton
          appearance="primary"
          type="submit"
          disabled={isPending}
          data-cy="submit-queue-button"
        >
          {isPending
            ? 'Saving...'
            : isEditMode
              ? 'Save Changes'
              : 'Create Queue'}
        </ActionButton>
        <ActionButton
          appearance="outlined"
          onClick={onCancel}
          data-cy="cancel-queue-button"
        >
          Cancel
        </ActionButton>
      </div>
    </form>
  )
}
