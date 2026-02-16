import Dropzone, { DropzoneRef } from 'react-dropzone'
import { ActionPanel } from '@/common/ActionPanel'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { LabelChip } from '@/common/labels/List'
import { PropsOf } from '@/lib/types'
import { MOD_EVENTS } from '@/mod-event/constants'
import {
  getEventFromFormData,
  useActionSubjects,
} from '@/mod-event/helpers/emitEvent'
import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import {
  AtUri,
  ComAtprotoAdminDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationScheduleAction,
  ToolsOzoneTeamDefs,
} from '@atproto/api'
import { DialogTitle } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import {
  createRef,
  FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'react-toastify'
import { WORKSPACE_FORM_ID } from './constants'
import {
  useWorkspaceEmptyMutation,
  useWorkspaceImport,
  useWorkspaceList,
  useWorkspaceRemoveItemsMutation,
} from './hooks'
import WorkspaceItemCreator from './ItemCreator'
import WorkspaceList from './List'
import { WorkspacePanelActionForm } from './PanelActionForm'
import { WorkspacePanelActions } from './PanelActions'
import { useWorkspaceListData, WorkspaceListData } from './useWorkspaceListData'
import { isNonNullable, isValidDid, pluralize } from '@/lib/util'
import { EmailComposerData } from 'components/email/helpers'
import { Alert } from '@/common/Alert'
import { RevokeCredentials } from 'components/repositories/RevokeCredential'
import { findHighProfileCountInWorkspace } from './utils'
import { HIGH_PROFILE_FOLLOWER_THRESHOLD } from '@/lib/constants'
import { numberFormatter } from '@/repositories/HighProfileWarning'
import { ConfirmationModal } from '@/common/modals/confirmation'

export function WorkspacePanel(props: PropsOf<typeof ActionPanel>) {
  const { onClose, ...others } = props

  const formRef = useRef<HTMLFormElement>(null)
  const [showActionForm, setShowActionForm] = useState(false)
  const [showAccountActions, setShowAccountActions] = useState(false)
  const removeItemsMutation = useWorkspaceRemoveItemsMutation()
  const emptyWorkspaceMutation = useWorkspaceEmptyMutation()
  const { importFromFiles } = useWorkspaceImport()
  const [modEventType, setModEventType] = useState<string>(
    MOD_EVENTS.ACKNOWLEDGE,
  )
  const [showItemCreator, setShowItemCreator] = useState(false)
  const actionSubjects = useActionSubjects()
  const dropzoneRef = createRef<DropzoneRef>()

  const getSelectedItems = () => {
    return Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name="workspaceItem"]:checked',
      ) || [],
      (checkbox) => checkbox.value,
    )
  }

  const handleRemoveSelected = () => {
    removeItemsMutation.mutate(getSelectedItems())
  }

  const handleRemoveItem = (item: string) => {
    removeItemsMutation.mutate([item])
  }

  const handleEmptyWorkspace = () => {
    emptyWorkspaceMutation.mutate()
  }

  const selectItems = (items: string[]) => {
    document
      .querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name="workspaceItem"]',
      )
      .forEach((checkbox) => {
        if (items.includes(checkbox.value)) {
          checkbox.checked = true
          // There's an event handler on the checkbox for mousedown event that syncs with a react state
          // for last checked index. We need to trigger that event to keep the state in sync
          checkbox.dispatchEvent(new Event('mousedown'))
        }
      })
  }

  // confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const [submission, setSubmission] = useState<{
    isSubmitting: boolean
    error: string
  }>({ isSubmitting: false, error: '' })

  const labelerAgent = useLabelerAgent()
  const { pds, role } = useServerConfig()
  const handleFindCorrelation =
    pds != null
      ? async () => {
          const selectedItems = new FormData(formRef.current!)
            .getAll('workspaceItem')
            .filter((item): item is string => typeof item === 'string')

          // For every selected item, find out which DID it corresponds
          const dids = selectedItems
            .map((item) => {
              if (item.startsWith('did:')) return item

              const itemData = workspaceListStatuses?.[item]

              if (itemData?.repo?.did) {
                return itemData.repo.did
              }

              if (itemData?.status) {
                const { subject } = itemData.status
                if (ComAtprotoAdminDefs.isRepoRef(subject)) {
                  return subject.did
                }

                if (ComAtprotoRepoStrongRef.isMain(subject)) {
                  return new AtUri(subject.uri).host
                }
              }

              // Should never happen (future proofing against new item types in workspace)
              return undefined
            })
            .filter(isNonNullable)

          if (dids.length <= 1) {
            toast.warning('Please select at least two accounts to correlate.')
            return
          }

          if (dids.length !== selectedItems.length) {
            toast.info(
              'Only accounts can be correlated (ignoring non-accounts).',
            )
          }

          const res = await labelerAgent.tools.ozone.signature.findCorrelation({
            dids,
          })

          const { details } = res.data

          if (!details.length) {
            toast.info('No correlation found between the selected accounts.')
          } else {
            toast.success(
              <div>
                The following correlation were found between the selected
                accounts:
                <br />
                {details.map(({ property, value }) => (
                  <Link
                    key={property}
                    href={`/repositories?term=sig:${encodeURIComponent(value)}`}
                  >
                    <LabelChip>
                      <MagnifyingGlassIcon className="h-3 w-3 inline" />
                      {property}
                    </LabelChip>
                  </Link>
                ))}
                {details.length > 1 && (
                  <>
                    <br />
                    <Link
                      key="all"
                      href={`/repositories?term=sig:${encodeURIComponent(
                        JSON.stringify(details.map((s) => s.value)),
                      )}`}
                      className="text-blue-500 underline"
                    >
                      Click here to show all accounts with the same details.
                    </Link>
                  </>
                )}
              </div>,
              {
                autoClose: 10_000,
              },
            )
          }
        }
      : undefined

  const { data: workspaceList } = useWorkspaceList()
  const { data: workspaceListStatuses, refetch: refetchWorkspaceListData } =
    useWorkspaceListData({
      subjects: workspaceList || [],
      // Make sure we aren't constantly refreshing the data unless the panel is open
      enabled: props.open,
    })
  const getSelectedWorkspaceItems = useCallback(() => {
    const selectedItems = getSelectedItems()
    return Object.entries(workspaceListStatuses ?? {})
      .filter(([key]) => selectedItems.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})
  }, [workspaceListStatuses])

  // submission
  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    const formData = new FormData(ev.target)
    const selectedItems = getSelectedWorkspaceItems()
    const count = findHighProfileCountInWorkspace(selectedItems)
    setHighProfileAccountSelectedCount(count)
    if (count > 0) {
      setShowConfirmationModal(true)
    } else {
      await submit(formData)
    }
  }
  const onConfirm = async () => {
    const formData = new FormData(formRef.current || undefined)
    await submit(formData)
  }
  const submit = async (formData: FormData) => {
    try {
      setShowConfirmationModal(false)
      setSubmission({ isSubmitting: true, error: '' })
      const labels = String(formData.get('labels'))?.split(',')
      const coreEvent = getEventFromFormData(modEventType, formData)

      if (ToolsOzoneModerationDefs.isModEventTakedown(coreEvent)) {
        // The Combobox component from headless ui does not support passing a `form` attribute to the hidden input
        // and since the input field is rendered outside of the main workspace form, we need to manually reach out
        // to the input field to get the selected value
        const policies =
          formRef?.current?.parentNode?.querySelector<HTMLInputElement>(
            'input[name="policies"]',
          )?.value

        if (policies) {
          coreEvent.policies = [String(policies)]
        } else {
          setSubmission({
            isSubmitting: false,
            error: 'Please select a policy for the takedown.',
          })
          return
        }
      }

      if (ToolsOzoneModerationDefs.isModEventTag(coreEvent)) {
        // By default, when there are no reference subject stats, the event builder returns all selected tags to be added
        // If the user wants to remove tags, we need to swap the add and remove properties
        if (formData.get('removeTags')) {
          coreEvent.remove = coreEvent.add
          coreEvent.add = []
        }
      }

      if (
        ToolsOzoneModerationDefs.isModEventLabel(coreEvent) &&
        labels?.length
      ) {
        const isRemovingLabels = formData.get('removeLabels')
        coreEvent.negateLabelVals = isRemovingLabels ? labels : []
        coreEvent.createLabelVals = isRemovingLabels ? [] : labels
      }

      // No need to break if one of the requests fail, continue on with others
      const externalUrl = String(formData.get('externalUrl') || '')
      const takedownType = String(formData.get('takedownType') || '')
      const executeInHours = Number(formData.get('scheduledDurationInHours'))
      const executionStartTime = new Date(
        Date.now() + executeInHours * 3600 * 1000,
      )

      // only respect scheduling when takedown type is scheduled for permanent or suspension, execution is immediate
      const scheduling =
        takedownType === 'scheduled'
          ? formData.get('randomizeExecutionTime')
            ? {
                executeAfter: executionStartTime.toISOString(),
                executeUntil: new Date(
                  executionStartTime.getTime() + 8 * 3600 * 1000,
                ).toISOString(),
              }
            : { executeAt: executionStartTime.toISOString() }
          : undefined

      const results = await actionSubjects(
        { event: coreEvent },
        Array.from(formData.getAll('workspaceItem') as string[]),
        workspaceListStatuses || {},
        { externalUrl, scheduling },
      )

      // After successful submission, reset the form state to clear inputs for previous submission
      formRef.current?.reset()

      // This state is not kept in the form and driven by state so we need to reset it manually after submission
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
      setSubmission({ error: '', isSubmitting: false })

      // Select items that were actioned so that user can either clear them or perform the next action on them
      if (results.succeeded.length) {
        selectItems(results.succeeded)
      }
    } catch (err) {
      setSubmission({ error: (err as Error).message, isSubmitting: false })
    }
  }

  const handleEmailSubmit = async (emailEvent: EmailComposerData) => {
    setSubmission({ isSubmitting: true, error: '' })
    try {
      setSubmission({ isSubmitting: true, error: '' })

      // No need to break if one of the requests fail, continue on with others
      const results = await actionSubjects(
        { event: emailEvent },
        // Emails can only be sent to DID subjects so filter out anything that's not a did
        getSelectedItems().filter(isValidDid),
        workspaceListStatuses || {},
        { externalUrl: '' }, // No external URL for email events
      )

      // Select items that were actioned so that user can either clear them or perform the next action on them
      if (results.succeeded.length) {
        return selectItems(results.succeeded)
      }

      // This state is not kept in the form and driven by state so we need to reset it manually after submission
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
      setSubmission({ error: '', isSubmitting: false })
    } catch (err) {
      setSubmission({ error: (err as Error).message, isSubmitting: false })
    }
  }

  /** Number of high profile accounts in workspace. */
  const highProfileAccountCount = useMemo(
    () =>
      workspaceListStatuses
        ? findHighProfileCountInWorkspace(workspaceListStatuses)
        : 0,
    [workspaceListStatuses],
  )

  /** Number of high profile accounts that are selected. */
  const [highProfileAccountSelectedCount, setHighProfileAccountSelectedCount] =
    useState(0)

  return (
    <FullScreenActionPanel
      title={
        <DialogTitle className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 flex flex-row justify-between pr-8">
          Workspace
        </DialogTitle>
      }
      onClose={onClose}
      {...others}
    >
      <Dropzone
        accept={{ 'application/json': ['.json'], 'text/csv': ['.csv'] }}
        onDrop={importFromFiles}
        ref={dropzoneRef}
        onDropRejected={(rejections) => {
          toast.error(
            rejections
              .map((r) => r.errors.map((e) => e.message).join(' | '))
              .flat()
              .join(' | '),
          )
        }}
        noKeyboard
        noClick
      >
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className={
              !workspaceList?.length
                ? 'flex flex-col flex-1 h-full item-center justify-center'
                : ''
            }
          >
            <input {...getInputProps()} />
            {!workspaceList?.length ? (
              <>
                <>
                  <CheckCircleIcon
                    title="Empty workspace"
                    className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
                  />
                  <p className="pb-4 text-center text-gray-400 dark:text-gray-50">
                    Workspace is empty.
                  </p>
                  <WorkspaceItemCreator
                    onFileUploadClick={() => {
                      dropzoneRef.current?.open()
                    }}
                  />
                </>
              </>
            ) : (
              <>
                {showItemCreator && (
                  <WorkspaceItemCreator
                    size="sm"
                    onFileUploadClick={() => {
                      dropzoneRef.current?.open()
                    }}
                    onCancel={() => setShowItemCreator(false)}
                  />
                )}
                {showActionForm && (
                  <>
                    <WorkspacePanelActionForm
                      modEventType={modEventType}
                      setModEventType={setModEventType}
                      handleEmailSubmit={handleEmailSubmit}
                      onCancel={() => setShowActionForm((current) => !current)}
                    />
                    {submission.error && (
                      <div className="mb-3">
                        <Alert
                          type="error"
                          body={submission.error}
                          title="Error submitting bulk action"
                        />
                      </div>
                    )}
                    {highProfileAccountCount > 0 && (
                      <div className="mb-3">
                        <Alert
                          type="warning"
                          title="High profile account in workspace"
                          body={`There are ${pluralize(
                            highProfileAccountCount,
                            'account',
                          )} in your workspace with ${numberFormatter.format(
                            HIGH_PROFILE_FOLLOWER_THRESHOLD,
                          )} followers. Please take caution when including those accounts in bulk action.`}
                        />
                      </div>
                    )}
                  </>
                )}
                {showAccountActions && (
                  <div className="mb-3 md:w-1/2 sm:w-2/3">
                    <RevokeCredentials
                      accounts={Object.values(workspaceListStatuses || {})
                        .filter((item) => item.subject.startsWith('did:'))
                        .map((item) => {
                          return {
                            did: item.subject,
                            handle: item.repo?.handle || 'Unknown Handle',
                          }
                        })}
                      onSuccess={(dids) => {
                        removeItemsMutation.mutate(dids)
                      }}
                      onClose={() => setShowAccountActions(false)}
                    />
                  </div>
                )}
                {/* The form component can't wrap the panel action form above because we may render the email composer */}
                {/* inside the panel action form which is it's own form so we use form ids to avoid nesting forms */}
                <form
                  ref={formRef}
                  id={WORKSPACE_FORM_ID}
                  onSubmit={onFormSubmit}
                  // The overflow here allows dropdowns in the form filter to adjust height of the window accordingly
                  className="overflow-y-auto"
                >
                  {!showItemCreator && (
                    <div className="mb-2 flex space-x-2">
                      <WorkspacePanelActions
                        listData={workspaceListStatuses || {}}
                        handleRemoveSelected={handleRemoveSelected}
                        handleEmptyWorkspace={handleEmptyWorkspace}
                        handleFindCorrelation={handleFindCorrelation}
                        setShowActionForm={setShowActionForm}
                        setShowItemCreator={setShowItemCreator}
                        showActionForm={showActionForm}
                        setShowAccountActions={setShowAccountActions}
                        showAccountActions={showAccountActions}
                        workspaceList={workspaceList}
                        onVerification={refetchWorkspaceListData}
                        canTakeAccountActions={
                          role === ToolsOzoneTeamDefs.ROLEADMIN
                        }
                      />
                    </div>
                  )}
                  {/* The inline styling is not ideal but there's no easy way to set calc() values in tailwind  */}
                  {/* We are basically telling the browser to leave 180px at the bottom of the container to make room for navigation arrows and use the remaining vertical space for the main content where scrolling will be allowed if content overflows */}
                  {/* @ts-ignore */}
                  <style jsx>{`
                    .scrollable-container {
                      height: calc(100vh - 100px);
                    }
                    @supports (-webkit-touch-callout: none) {
                      .scrollable-container {
                        height: calc(100svh - 100px);
                      }
                    }
                    @media (min-width: 640px) {
                      .scrollable-container {
                        height: calc(100vh - 180px);
                      }
                    }
                  `}</style>
                  <div className="scrollable-container overflow-y-auto">
                    <WorkspaceList
                      canExport={
                        !!role &&
                        [
                          ToolsOzoneTeamDefs.ROLEADMIN,
                          ToolsOzoneTeamDefs.ROLEMODERATOR,
                        ].includes(role)
                      }
                      list={workspaceList}
                      onRemoveItem={handleRemoveItem}
                      listData={workspaceListStatuses || {}}
                    />
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </Dropzone>

      <ConfirmationModal
        isOpen={showConfirmationModal}
        setIsOpen={setShowConfirmationModal}
        title="Confirm Action"
        description={
          <strong className="text-yellow-600 dark:text-yellow-400">
            This action includes{' '}
            {pluralize(highProfileAccountSelectedCount, 'high profile account')}
            . Are you sure?
          </strong>
        }
        confirmButtonText={
          submission.isSubmitting ? 'Processing...' : 'Yes, Proceed'
        }
        confirmButtonDisabled={submission.isSubmitting}
        onConfirm={onConfirm}
        error={submission.error}
      />
    </FullScreenActionPanel>
  )
}
