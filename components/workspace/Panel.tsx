import { ActionPanel } from '@/common/ActionPanel'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { LabelChip } from '@/common/labels'
import { PropsOf } from '@/lib/types'
import { MOD_EVENTS } from '@/mod-event/constants'
import { useActionSubjects } from '@/mod-event/helpers/emitEvent'
import { useLabelerAgent, useServerConfig } from '@/shell/ConfigurationContext'
import {
  AtUri,
  ComAtprotoAdminDefs,
  ComAtprotoModerationDefs,
  ComAtprotoRepoStrongRef,
  ToolsOzoneModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { Dialog } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FormEvent, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { WORKSPACE_FORM_ID } from './constants'
import {
  useWorkspaceEmptyMutation,
  useWorkspaceList,
  useWorkspaceRemoveItemsMutation,
} from './hooks'
import WorkspaceItemCreator from './ItemCreator'
import WorkspaceList from './List'
import { WorkspacePanelActionForm } from './PanelActionForm'
import { WorkspacePanelActions } from './PanelActions'
import { useWorkspaceListData } from './useWorkspaceListData'

function isNonNullable<V>(v: V): v is NonNullable<V> {
  return v != null
}

export function WorkspacePanel(props: PropsOf<typeof ActionPanel>) {
  const { onClose, ...others } = props

  const formRef = useRef<HTMLFormElement>(null)
  const [showActionForm, setShowActionForm] = useState(false)
  const removeItemsMutation = useWorkspaceRemoveItemsMutation()
  const emptyWorkspaceMutation = useWorkspaceEmptyMutation()
  const [modEventType, setModEventType] = useState<string>(
    MOD_EVENTS.ACKNOWLEDGE,
  )
  const [showItemCreator, setShowItemCreator] = useState(false)
  const actionSubjects = useActionSubjects()

  const handleRemoveSelected = () => {
    const selectedItems = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name="workspaceItem"]:checked',
      ) || [],
    ).map((checkbox) => checkbox.value)
    removeItemsMutation.mutate(selectedItems as string[])
  }

  const handleRemoveItem = (item: string) => {
    removeItemsMutation.mutate([item])
  }

  const handleEmptyWorkspace = () => {
    emptyWorkspaceMutation.mutate()
  }

  const [submission, setSubmission] = useState<{
    isSubmitting: boolean
    error: string
  }>({ isSubmitting: false, error: '' })

  const labelerAgent = useLabelerAgent()
  const supportsCorrelation = useServerConfig().pds != null
  const handleFindCorrelation = supportsCorrelation
    ? async () => {
        const selectedItems = new FormData(formRef.current!)
          .getAll('workspaceItem')
          .filter((item): item is string => typeof item === 'string')

        // For every selected item, find out which DID it corresponds
        const dids = selectedItems
          .map((item) => {
            if (item.startsWith('did:')) return item

            const status = workspaceListStatuses?.[item]

            if (ToolsOzoneModerationDefs.isRepoViewDetail(status)) {
              return status.did
            }

            if (ToolsOzoneModerationDefs.isRecordViewDetail(status)) {
              return status.repo.did
            }

            if (ToolsOzoneModerationDefs.isSubjectStatusView(status)) {
              const { subject } = status
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
          toast.info('Only accounts can be correlated (ignoring non-accounts).')
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

  // on form submit
  const onFormSubmit = async (
    ev: FormEvent<HTMLFormElement> & { target: HTMLFormElement },
  ) => {
    ev.preventDefault()
    try {
      setSubmission({ isSubmitting: true, error: '' })
      const formData = new FormData(ev.currentTarget)
      const labels = String(formData.get('labels'))?.split(',')
      const coreEvent: ToolsOzoneModerationEmitEvent.InputSchema['event'] = {
        $type: modEventType,
      }

      if (formData.get('durationInHours')) {
        coreEvent.durationInHours = Number(formData.get('durationInHours'))
      }

      if (formData.get('comment')) {
        coreEvent.comment = formData.get('comment')
      }

      if (formData.get('sticky')) {
        coreEvent.sticky = true
      }

      // @TODO: Limitation that we only allow adding tags/labels in bulk but not removal
      if (formData.get('tags')) {
        const isRemovingTags = formData.get('removeTags')
        const tags = String(formData.get('tags'))
          .split(',')
          .map((tag) => tag.trim())
        coreEvent.add = isRemovingTags ? [] : tags
        coreEvent.remove = isRemovingTags ? tags : []
      }

      if (labels?.length) {
        const isRemovingLabels = formData.get('removeLabels')
        coreEvent.negateLabelVals = isRemovingLabels ? labels : []
        coreEvent.createLabelVals = isRemovingLabels ? [] : labels
      }

      // Appeal type doesn't really exist, behind the scenes, it's just a report event with special reason
      if (coreEvent.$type === MOD_EVENTS.APPEAL) {
        coreEvent.$type = MOD_EVENTS.REPORT
        coreEvent.reportType = ComAtprotoModerationDefs.REASONAPPEAL
      }

      if (
        coreEvent.$type === MOD_EVENTS.TAKEDOWN &&
        formData.get('acknowledgeAccountSubjects')
      ) {
        coreEvent.acknowledgeAccountSubjects = true
      }

      // No need to break if one of the requests fail, continue on with others
      const results = await actionSubjects(
        { event: coreEvent },
        Array.from(formData.getAll('workspaceItem') as string[]),
      )

      // After successful submission, reset the form state to clear inputs for previous submission
      ev.target.reset()

      // This state is not kept in the form and driven by state so we need to reset it manually after submission
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
      setSubmission({ error: '', isSubmitting: false })

      // If there are any item that failed to action, we want to keep them checked so users know which ones to retry
      if (results.failed.length) {
        document
          .querySelectorAll<HTMLInputElement>(
            'input[type="checkbox"][name="workspaceItem"]',
          )
          .forEach((checkbox) => {
            if (results.failed.includes(checkbox.value)) {
              checkbox.checked = true
              // There's an event handler on the checkbox for mousedown event that syncs with a react state
              // for last checked index. We need to trigger that event to keep the state in sync
              checkbox.dispatchEvent(new Event('mousedown'))
            }
          })
      }
    } catch (err) {
      console.error(err)
      setSubmission({ error: (err as Error).message, isSubmitting: false })
    }
  }

  const { data: workspaceList } = useWorkspaceList()
  const { data: workspaceListStatuses } = useWorkspaceListData({
    subjects: workspaceList || [],
    // Make sure we aren't constantly refreshing the data unless the panel is open
    enabled: props.open,
  })

  return (
    <FullScreenActionPanel
      title={
        <Dialog.Title className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 flex flex-row justify-between pr-8">
          Workspace
        </Dialog.Title>
      }
      onClose={onClose}
      {...others}
    >
      {!workspaceList?.length ? (
        <div className="flex flex-col flex-1 h-full item-center justify-center">
          <>
            <CheckCircleIcon
              title="Empty workspace"
              className="h-10 w-10 text-green-300 align-text-bottom mx-auto mb-4"
            />
            <p className="pb-4 text-center text-gray-400 dark:text-gray-50">
              Workspace is empty.
            </p>
            <WorkspaceItemCreator />
          </>
        </div>
      ) : (
        <>
          {showItemCreator && (
            <WorkspaceItemCreator
              size="sm"
              onCancel={() => setShowItemCreator(false)}
            />
          )}
          <form ref={formRef} id={WORKSPACE_FORM_ID} onSubmit={onFormSubmit}>
            {showActionForm && (
              <WorkspacePanelActionForm
                {...{
                  modEventType,
                  setModEventType,
                  onCancel: () => setShowActionForm((current) => !current),
                }}
              />
            )}
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
                  workspaceList={workspaceList}
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
                list={workspaceList}
                onRemoveItem={handleRemoveItem}
                listData={workspaceListStatuses || {}}
              />
            </div>
          </form>
        </>
      )}
    </FullScreenActionPanel>
  )
}
