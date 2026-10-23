import { ActionButton } from '@/common/buttons'
import { Checkbox, FormLabel, Input, Textarea } from '@/common/forms'
import { CollectionAutocomplete } from '../../common/CollectionAutocomplete'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'
import { useRef, useState } from 'react'
import { Tooltip } from '@/common/Tooltip'
import { useCreateQueue, useUpdateQueue } from '../useQueues'
import { ActionPoliciesSelector } from '@/reports/ModerationForm/ActionPolicySelector'
import { LabelSelector } from '@/common/labels/Selector'
import { useServerConfig } from '@/shell/ConfigurationContext'
import { ToolsOzoneQueueDefs, ToolsOzoneTeamDefs } from '@atproto/api'
import { reasonTypeOptions } from '@/reports/helpers/getType'
import { QUEUE_HELP, QueueHelp } from '../QueueHelp'

import { MatchSummary } from '../MatchSummary'
import { parseQueueTags } from './matching'

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
  const isAdmin = useServerConfig().role === ToolsOzoneTeamDefs.ROLEADMIN
  const createMutation = useCreateQueue()
  const updateMutation = useUpdateQueue()
  const isLoading = createMutation.isLoading || updateMutation.isLoading

  // form
  const [name, setName] = useState(queue?.name ?? '')
  const [description, setDescription] = useState<string | undefined>(
    queue?.description,
  )
  const [showToggleDialog, setShowToggleDialog] = useState(false)
  const initialStrictAccess = useRef(queue?.strictAccess ?? false).current
  const [strictAccess, setStrictAccess] = useState(initialStrictAccess)
  const strictAccessInput =
    isAdmin && (!isEditMode || strictAccess !== initialStrictAccess)
      ? { strictAccess }
      : {}
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
  const [reporterTagsInput, setReporterTagsInput] = useState(
    queue?.reporterTags?.join(', ') ?? '',
  )
  const [accountTagsInput, setAccountTagsInput] = useState(
    queue?.accountTags?.join(', ') ?? '',
  )
  const reporterTags = parseQueueTags(reporterTagsInput)
  const accountTags = parseQueueTags(accountTagsInput)
  const [recommendedPolicies, setRecommendedPolicies] = useState<string[]>(
    queue?.recommendedPolicies ?? [],
  )
  const [recommendedLabels, setRecommendedLabels] = useState<string[]>(
    queue?.recommendedLabels ?? [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleToggleEnabled = async () => {
    if (!queue) return
    await updateMutation.mutateAsync(
      {
        queueId: queue.id,
        name: queue.name,
        description: queue.description,
        recommendedPolicies,
        recommendedLabels,
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
      if (reporterTags.length > 25) {
        newErrors.reporterTags = 'Maximum 25 reporter tags allowed'
      }
      if (accountTags.length > 25) {
        newErrors.accountTags = 'Maximum 25 account tags allowed'
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
          recommendedPolicies,
          recommendedLabels,
          ...strictAccessInput,
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
          reporterTags,
          accountTags,
          collection: collectionSanitized,
          recommendedPolicies,
          recommendedLabels,
          ...strictAccessInput,
        },
        { onSuccess },
      )
    }
  }

  return (
    <form id="queue-form" onSubmit={handleSubmit} className="space-y-4">
      {!isEditMode && (
        <p className="text-sm text-gray-400">
          Create a queue to route reports to. Matching criteria cannot be
          modified after creation. To change the subjects, reasons, or tags,
          create a new queue and migrate reports to it. Leave the matching
          criteria empty to create a queue that only receives reports routed to
          it explicitly.
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

      <div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Checkbox
              id="strictAccess"
              checked={strictAccess}
              onChange={(event) => setStrictAccess(event.target.checked)}
              label="Strict access"
              aria-describedby="strictAccess-help"
            />
          ) : (
            <span className="text-sm">
              Strict access: {queue?.strictAccess ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
        <p
          id="strictAccess-help"
          className="mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          Enabling this will only allow assigned moderators to access it. Admins
          can always access it.
        </p>
        {!isAdmin && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only admins can change strict access.
          </p>
        )}
      </div>

      <FormLabel label="Recommended takedown policies" className="mb-3">
        <ActionPoliciesSelector
          defaultPolicies={recommendedPolicies}
          onSelect={setRecommendedPolicies}
          name="recommendedPolicies"
          usePolicyKeys
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          These policies appear first when actioning reports in this queue.
        </p>
      </FormLabel>

      <FormLabel label="Recommended labels" className="mb-3">
        <LabelSelector
          id="recommendedLabels"
          name="recommendedLabels"
          form="queue-form"
          defaultLabels={recommendedLabels}
          onChange={setRecommendedLabels}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          These labels are recommended for this queue and route label appeals
          here when no source queue is known.
        </p>
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
          <FormLabel label="Subject Type(s)">
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
              <div className="h-8 flex items-center gap-1">
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
              <div className="h-6 flex items-center gap-1">
                <Checkbox
                  id="subjectTypes-conversation"
                  name="subjectTypes"
                  checked={subjectTypes.has('conversation')}
                  onChange={() => toggleSubjectType('conversation')}
                  label="conversation"
                />
                <Tooltip anchor="right start">
                  Reports against an entire DM conversation, such as a group
                  chat.
                </Tooltip>
              </div>
            </div>
            {errors.subjectTypes && (
              <p className="text-red-500 text-xs mt-1">{errors.subjectTypes}</p>
            )}
          </FormLabel>

          <FormLabel label="Report Type(s)" className="mb-3">
            <div className="mb-2 flex gap-3 text-xs">
              <button
                type="button"
                className="text-indigo-600 dark:text-teal-400 hover:underline"
                onClick={() =>
                  setReportTypes((selected) => [
                    ...new Set([
                      ...selected,
                      ...Object.keys(reasonTypeOptions),
                    ]),
                  ])
                }
              >
                Select all available types
              </button>
              <button
                type="button"
                className="text-indigo-600 dark:text-teal-400 hover:underline"
                onClick={() => setReportTypes([])}
              >
                Clear selection
              </button>
            </div>
            <ReportTypeMultiselect
              value={reportTypes}
              limit={Infinity}
              onChange={setReportTypes}
              data-cy="report-types-input"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Only selected report types match, including when tags are
              configured. Select every available type to cover all current
              reasons. Leave empty for explicit routing only.
            </p>
            {errors.reportTypes && (
              <p className="text-red-500 text-xs mt-1">{errors.reportTypes}</p>
            )}
          </FormLabel>

          <FormLabel
            label="Reporter tags"
            htmlFor="reporterTags"
            extraLabel={
              <QueueHelp
                id="reporterTags-tooltip"
                label="About reporter tags"
                description={QUEUE_HELP.reporterTags}
              />
            }
          >
            <Input
              id="reporterTags"
              name="reporterTags"
              value={reporterTagsInput}
              onChange={(e) => setReporterTagsInput(e.target.value)}
              placeholder="Comma-separated tags"
              className="block w-full"
              aria-describedby="reporterTags-tooltip reporterTags-help"
              aria-invalid={!!errors.reporterTags}
            />
            <p
              id="reporterTags-help"
              className="mt-1 text-xs text-gray-500 dark:text-gray-400"
            >
              Match any listed tag on the account submitting the report. Leave
              empty for no reporter tag restriction. Maximum 25 tags.
            </p>
            {errors.reporterTags && (
              <p role="alert" className="text-red-500 text-xs mt-1">
                {errors.reporterTags}
              </p>
            )}
          </FormLabel>

          <FormLabel
            label="Account tags"
            htmlFor="accountTags"
            extraLabel={
              <QueueHelp
                id="accountTags-tooltip"
                label="About account tags"
                description={QUEUE_HELP.accountTags}
              />
            }
          >
            <Input
              id="accountTags"
              name="accountTags"
              value={accountTagsInput}
              onChange={(e) => setAccountTagsInput(e.target.value)}
              placeholder="Comma-separated tags"
              className="block w-full"
              aria-describedby="accountTags-tooltip accountTags-help"
              aria-invalid={!!errors.accountTags}
            />
            <p
              id="accountTags-help"
              className="mt-1 text-xs text-gray-500 dark:text-gray-400"
            >
              Match tags on the account that is being reported against. For
              content reports, use the author&apos;s account tags. Match any
              listed tag; leave empty for no account tag restriction. Maximum 25
              tags. If both tag lists are populated, both must match.
            </p>
            {errors.accountTags && (
              <p role="alert" className="text-red-500 text-xs mt-1">
                {errors.accountTags}
              </p>
            )}
          </FormLabel>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            All configured conditions must match. Tool destinations take
            precedence. Otherwise, the lowest matching queue ID wins, regardless
            of tags.
          </p>
        </>
      )}

      {isEditMode && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Matching criteria are read-only. To change them, create a new queue
          and migrate reports to it.
        </p>
      )}
      <h2 className="text-lg">Matching criteria</h2>
      <MatchSummary
        subjectTypes={Array.from(subjectTypes)}
        collection={collectionSanitized}
        reportTypes={reportTypes}
        reporterTags={reporterTags}
        accountTags={accountTags}
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
