import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { CollectionAutocomplete } from '../../common/CollectionAutocomplete'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { ReasonBadge } from '@/reports/ReasonBadge'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { ToolsOzoneQueueDefs } from '@atproto/api'
import { useState } from 'react'
import { Tooltip } from '@/common/Tooltip'
import { useCreateQueue, useUpdateQueue } from '../useQueues'

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
            <div className="flex flex-wrap gap-1 mt-1 pl-3">
              {reportTypes.map((t) => (
                <ReasonBadge key={t} reasonType={t} />
              ))}
            </div>
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
  const [showToggleDialog, setShowToggleDialog] = useState(false)
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

  const handleToggleEnabled = async () => {
    if (!queue) return
    await updateMutation.mutateAsync(
      {
        queueId: queue.id,
        name: queue.name,
        description: queue.description,
        enabled: !queue.enabled,
      },
      {
        onSuccess: () => {
          setShowToggleDialog(false)
          onSuccess()
        },
      },
    )
  }

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
          Create a queue to route reports to. Only the name and description can
          be modified after creation. To change the filtering logic (subject
          types, report types, collection), you will need to create a new queue
          and migrate reports to it.
        </p>
      )}
      <FormLabel label="Name" htmlFor="name" required className="mb-3">
        <Input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name for the queue"
          className="block w-full"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </FormLabel>

      <FormLabel label="Description" htmlFor="description" className="mb-3">
        <Textarea
          id="description"
          name="description"
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
            <div className="flex flex-col gap-5">
              <div className="h-8 flex items-center gap-1">
                <Checkbox
                  id="subjectTypes-account"
                  name="subjectTypes"
                  checked={subjectTypes.has('account')}
                  onChange={() => toggleSubjectType('account')}
                  label="account"
                />
                <Tooltip anchor="right start">
                  Reports against a user&apos;s account.
                </Tooltip>
              </div>
              <div className="h-8 flex items-start gap-1">
                <Checkbox
                  id="subjectTypes-record"
                  name="subjectTypes"
                  checked={subjectTypes.has('record')}
                  onChange={() => toggleSubjectType('record')}
                  label="record"
                />
                <Tooltip anchor="right start">
                  Reports targeting a specific piece of content such as a post
                  or reply. Optionally filter by collection.
                </Tooltip>
                {subjectTypes.has('record') && (
                  <CollectionAutocomplete
                    value={collection}
                    id="collection"
                    name="collection"
                    onChange={setCollection}
                    placeholder="Optional collection to use."
                    className="ml-6 w-96"
                  />
                )}
              </div>
              <div className="h-6 flex items-center gap-1">
                <Checkbox
                  id="subjectTypes-message"
                  name="subjectTypes"
                  checked={subjectTypes.has('message')}
                  onChange={() => toggleSubjectType('message')}
                  label="message"
                />
                <Tooltip anchor="right start">
                  Reports against direct messages.
                </Tooltip>
              </div>
            </div>
            {errors.subjectTypes && (
              <p className="text-red-500 text-xs mt-1">{errors.subjectTypes}</p>
            )}
          </FormLabel>

          <FormLabel label="Report Type(s)" required className="mb-3">
            <ReportTypeMultiselect
              value={reportTypes}
              limit={25}
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
        {isEditMode && queue && (
          <ActionButton
            appearance={queue.enabled ? 'negative' : 'outlined'}
            type="button"
            onClick={() => setShowToggleDialog(true)}
          >
            {queue.enabled ? 'Disable Queue' : 'Enable Queue'}
          </ActionButton>
        )}
        <ActionButton
          appearance="outlined"
          onClick={onCancel}
          data-cy="cancel-queue-button"
        >
          Cancel
        </ActionButton>
      </div>

      {isEditMode && queue && (
        <ConfirmationModal
          isOpen={showToggleDialog}
          setIsOpen={setShowToggleDialog}
          onConfirm={handleToggleEnabled}
          title={`${queue.enabled ? 'Disable' : 'Enable'} '${queue.name}'?`}
          confirmButtonText={queue.enabled ? 'Disable Queue' : 'Enable Queue'}
          confirmButtonDisabled={isLoading}
          description={
            queue.enabled ? (
              <span>
                Disabling this queue means reports will instead be routed to
                other queues. Reports already in this queue will remain.
              </span>
            ) : (
              <span>
                Re-enabling this queue will divert reports away from other
                queues. Please proceed with caution.
              </span>
            )
          }
        />
      )}
    </form>
  )
}
