import { useState } from 'react'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { ActionButton } from '@/common/buttons'
import { Input, Textarea, FormLabel, Checkbox } from '@/common/forms'
import { useCreateQueue, useUpdateQueue } from './useQueues'

const SUBJECT_TYPE_OPTIONS = ['account', 'record', 'message'] as const

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
  const isPending = createMutation.isLoading || updateMutation.isLoading

  const [name, setName] = useState(queue?.name ?? '')
  const [enabled, setEnabled] = useState(queue?.enabled ?? true)
  const [subjectTypes, setSubjectTypes] = useState<Set<string>>(
    new Set(queue?.subjectTypes ?? []),
  )
  const [collection, setCollection] = useState(queue?.collection ?? '')
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

      await createMutation.mutateAsync(
        {
          name,
          subjectTypes: Array.from(subjectTypes),
          reportTypes,
          ...(subjectTypes.has('record') && collection.trim()
            ? { collection: collection.trim() }
            : {}),
        },
        { onSuccess },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-medium text-gray-700 dark:text-gray-100">
        {isEditMode ? 'Edit Queue' : 'Create Queue'}
      </h4>

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
        <FormLabel label="Enabled" className="mb-3">
          <Checkbox
            id="queue-enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            label={enabled ? 'Queue is enabled' : 'Queue is disabled'}
          />
        </FormLabel>
      )}

      <FormLabel
        label="Subject Types"
        required={!isEditMode}
        className="mb-3"
      >
        {isEditMode ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {queue?.subjectTypes.join(', ')}
          </p>
        ) : (
          <div className="flex gap-4">
            {SUBJECT_TYPE_OPTIONS.map((type) => (
              <Checkbox
                key={type}
                id={`subject-type-${type}`}
                checked={subjectTypes.has(type)}
                onChange={() => toggleSubjectType(type)}
                label={type}
              />
            ))}
          </div>
        )}
        {errors.subjectTypes && (
          <p className="text-red-500 text-xs mt-1">{errors.subjectTypes}</p>
        )}
      </FormLabel>

      {!isEditMode && subjectTypes.has('record') && (
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

      {isEditMode && queue?.collection && (
        <FormLabel label="Collection" className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
              {queue.collection}
            </code>
          </p>
        </FormLabel>
      )}

      <FormLabel
        label="Report Types"
        htmlFor="queue-report-types"
        required={!isEditMode}
        className="mb-3"
      >
        {isEditMode ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {queue?.reportTypes.join(', ')}
          </p>
        ) : (
          <Textarea
            id="queue-report-types"
            value={reportTypesText}
            onChange={(e) => setReportTypesText(e.target.value)}
            placeholder="tools.ozone.report.defs#reasonSpam"
            className="block w-full"
            rows={3}
          />
        )}
        {errors.reportTypes && (
          <p className="text-red-500 text-xs mt-1">{errors.reportTypes}</p>
        )}
      </FormLabel>

      <div className="flex gap-2 pt-2">
        <ActionButton
          appearance="primary"
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? 'Saving...'
            : isEditMode
              ? 'Save Changes'
              : 'Create Queue'}
        </ActionButton>
        <ActionButton appearance="outlined" onClick={onCancel}>
          Cancel
        </ActionButton>
      </div>
    </form>
  )
}
