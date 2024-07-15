import {
  ComAtprotoModerationDefs,
  ToolsOzoneModerationEmitEvent,
} from '@atproto/api'
import { FormEvent, useRef, useState } from 'react'
import { ActionPanel } from '@/common/ActionPanel'
import { PropsOf } from '@/lib/types'
import { FullScreenActionPanel } from '@/common/FullScreenActionPanel'
import { createBreakpoint } from 'react-use'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { MOD_EVENTS } from '@/mod-event/constants'
import { Dialog } from '@headlessui/react'
import {
  useWorkspaceEmptyMutation,
  useWorkspaceList,
  useWorkspaceRemoveItemsMutation,
} from './hooks'
import WorkspaceList from './List'
import WorkspaceItemCreator from './ItemCreator'
import { useSubjectStatuses } from '@/subject/useSubjectStatus'
import { WorkspacePanelActions } from './PanelActions'
import { WORKSPACE_FORM_ID } from './constants'
import { WorkspacePanelActionForm } from './PanelActionForm'
import clientManager from '@/lib/client'
import { actionSubjects } from '@/mod-event/helpers/emitEvent'

const useBreakpoint = createBreakpoint({ xs: 340, sm: 640 })

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

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

  const handleSelectAll = () => {
    const checkboxes = formRef.current?.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][name="workspaceItem"]',
    )
    const allSelected = Array.from(checkboxes || []).every(
      (checkbox) => checkbox.checked,
    )
    checkboxes?.forEach((checkbox) => (checkbox.checked = !allSelected))
  }

  const handleRemoveSelected = () => {
    const selectedItems = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name="workspaceItem"]:checked',
      ) || [],
    ).map((checkbox) => checkbox.value)
    removeItemsMutation.mutate(selectedItems)
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
        const tags = String(formData.get('tags'))
          .split(',')
          .map((tag) => tag.trim())
        coreEvent.add = tags
        coreEvent.remove = []
      }

      if (labels?.length) {
        coreEvent.createLabelVals = labels
        coreEvent.negateLabelVals = []
      }

      // Appeal type doesn't really exist, behind the scenes, it's just a report event with special reason
      if (coreEvent.$type === MOD_EVENTS.APPEAL) {
        coreEvent.$type = MOD_EVENTS.REPORT
        coreEvent.reportType = ComAtprotoModerationDefs.REASONAPPEAL
      }

      // No need to break if one of the requests fail, continue on with others
      await actionSubjects(
        {
          event: coreEvent,
          subjectBlobCids: [],
          createdBy: clientManager.session.did,
        },
        Array.from(formData.getAll('workspaceItem') as string[]),
      )

      // After successful submission, reset the form state to clear inputs for previous submission
      ev.target.reset()

      // This state is not kept in the form and driven by state so we need to reset it manually after submission
      setModEventType(MOD_EVENTS.ACKNOWLEDGE)
      setSubmission({ error: '', isSubmitting: false })
    } catch (err) {
      setSubmission({ error: (err as Error).message, isSubmitting: false })
    }
  }

  const { data: workspaceList } = useWorkspaceList()
  //   @TODO: Probably don't need a loading state for subject statuses here?
  const { data: workspaceListStatuses } = useSubjectStatuses({
    subjects: workspaceList || [],
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
                  {...{
                    handleSelectAll,
                    handleRemoveSelected,
                    handleEmptyWorkspace,
                    setShowActionForm,
                    setShowItemCreator,
                    showActionForm,
                    workspaceList,
                  }}
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
                subjectStatuses={workspaceListStatuses || {}}
              />
            </div>
          </form>
        </>
      )}
    </FullScreenActionPanel>
  )
}
