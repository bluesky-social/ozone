import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { useState } from 'react'
import { useCreateQueue, useUpdateQueue } from '../useQueues'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { reasonTypeOptions } from '@/reports/helpers/getType'

function MatchSummary({
  subjectTypes,
  collection,
  reportTypes,
}: {
  subjectTypes: Set<string>
  collection: string | undefined
  reportTypes: string[]
}) {
  const subjectList = Array.from(subjectTypes)

  if (subjectTypes.size === 0 || reportTypes.length === 0) {
    return (
      <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-900 dark:text-yellow-200">
        No reports will match this queue.
      </div>
    )
  }

  const nonRecordTypes = subjectList.filter((t) => t !== 'record')

  return (
    <div>
      <h2 className="text-lg">Summary</h2>
      <p className="mb-2 text-sm">How a report matches this queue:</p>
      <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-900 dark:text-blue-200">
        <div className="space-y-1">
          <div>
            <span>Report reason</span> is one of:
            <ul className="list-disc list-inside pl-3 mt-0.5 space-y-0.5">
              {reportTypes.map((t) => (
                <li key={t}>
                  <strong>{reasonTypeOptions[t] || t}</strong>
                </li>
              ))}
            </ul>
          </div>
          <p className="pl-16 py-4 opacity-70">AND</p>
          <div>
            <span>Subject</span> is one of:
            <ul className="list-disc list-inside pl-3 mt-0.5 space-y-0.5">
              {nonRecordTypes.map((t) => (
                <li key={t}>
                  <strong>{t}</strong>
                </li>
              ))}
              {subjectTypes.has('record') && (
                <li>
                  {collection ? (
                    <span>
                      {' '}
                      <strong>record</strong> with collection{' '}
                      <strong>{collection}</strong>
                    </span>
                  ) : (
                    <span>
                      <strong>record</strong>
                    </span>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
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
  const isLoading = createMutation.isLoading || updateMutation.isLoading

  // form
  const [name, setName] = useState(queue?.name ?? '')
  const [description, setDescription] = useState<string | undefined>(
    queue?.description,
  )
  const [enabled, setEnabled] = useState(queue?.enabled ?? true)
  const [subjectTypes, setSubjectTypes] = useState<Set<string>>(
    new Set(queue?.subjectTypes ?? []),
  )
  const [collection, setCollection] = useState<string | undefined>(
    queue?.collection?.trim() || undefined,
  )
  const collectionSanitized =
    subjectTypes.has('record') && collection?.trim()
      ? collection.trim()
      : undefined
  const [reportTypes, setReportTypes] = useState<string[]>(
    queue?.reportTypes ?? [],
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
          name,
          description,
          enabled,
        },
        { onSuccess },
      )
    } else {
      await createMutation.mutateAsync(
        {
          name,
          description,
          subjectTypes: Array.from(subjectTypes),
          reportTypes,
          collection: collectionSanitized,
        },
        { onSuccess },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEditMode && (
        <p className="text-sm text-gray-400">
          Create a queue to route reports to. Only the name and description can be modified after creation. To change the filtering logic (subject types, report types, collection), you will need to create a new queue and migrate reports to it.
        </p>
      )}
      <FormLabel label="Name" htmlFor="queue-name" required className="mb-3">
        <Input
          type="text"
          id="queue-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name for the queue"
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
          label="Enable"
        />
      )}

      <FormLabel
        label="Description"
        htmlFor="queue-description"
        className="mb-3"
      >
        <Textarea
          id="queue-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter additional details for internal use."
          className="block w-full"
          rows={3}
        />
      </FormLabel>

      {!isEditMode && (
        <>
          <FormLabel label="Subject Type(s)" required>
            <div className="flex flex-col gap-2">
              <Checkbox
                id="subject-type-account"
                checked={subjectTypes.has('account')}
                onChange={() => toggleSubjectType('account')}
                label="account"
              />
              <div className="h-12 flex items-center gap-2">
                <Checkbox
                  id="subject-type-record"
                  checked={subjectTypes.has('record')}
                  onChange={() => toggleSubjectType('record')}
                  label="record"
                />
                {subjectTypes.has('record') && (
                  <Input
                    type="text"
                    id="queue-collection"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    placeholder="e.g. app.bsky.feed.post"
                    className="w-96 my-0"
                  />
                )}
              </div>
              <Checkbox
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

          <FormLabel label="Report Type(s)" required className="mb-3">
            <ReportTypeMultiselect
              value={reportTypes}
              onChange={setReportTypes}
              data-cy="report-types-input"
            />
            {errors.reportTypes && (
              <p className="text-red-500 text-xs mt-1">{errors.reportTypes}</p>
            )}
          </FormLabel>
        </>
      )}

      <MatchSummary
        subjectTypes={subjectTypes}
        collection={collectionSanitized}
        reportTypes={reportTypes}
      />

      <div className="flex gap-2 pt-2">
        <ActionButton
          appearance="primary"
          type="submit"
          disabled={isLoading}
          data-cy="submit-queue-button"
        >
          {isLoading
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
