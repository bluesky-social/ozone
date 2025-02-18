import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { ActionButton } from '@/common/buttons'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { pluralize } from '@/lib/util'
import { useWorkspaceAddItemsMutation } from './hooks'

export const SubjectToWorkspaceAction = ({
  getSubjectsNextPage,
  initialSubjects,
  hasNextPage,
  subjectType = 'user',
  description,
}: {
  initialSubjects: string[]
  hasNextPage?: boolean
  getSubjectsNextPage: () => Promise<{
    subjects: string[]
    hasNextPage?: boolean
  }>
  subjectType?: 'user' | 'post' | 'subject'
  description: JSX.Element
}) => {
  const abortController = useRef<AbortController | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { mutateAsync: addItemsToWorkspace } = useWorkspaceAddItemsMutation()

  const confirmAddToWorkspace = async () => {
    // add items that are already loaded
    await addItemsToWorkspace(initialSubjects)
    if (!hasNextPage) {
      setIsConfirmationOpen(false)
      return
    }
    setIsAdding(true)
    const newAbortController = new AbortController()
    abortController.current = newAbortController

    try {
      let hasMore = false
      do {
        const nextPage = await getSubjectsNextPage()
        hasMore = !!nextPage.hasNextPage
        if (nextPage.subjects.length) {
          await addItemsToWorkspace(nextPage.subjects)
        } else {
          toast.info(`Finished adding ${subjectType} to workspace`)
        }
        if (abortController.current?.signal.aborted) {
          toast.info(`Stopped adding ${subjectType} to workspace`)
        }
      } while (hasMore && !abortController.current?.signal.aborted)
    } catch (e) {
      toast.error(`Something went wrong: ${(e as Error).message}`)
    }
    setIsAdding(false)
    setIsConfirmationOpen(false)
  }

  useEffect(() => {
    if (!isConfirmationOpen) {
      abortController.current?.abort()
    }
  }, [isConfirmationOpen])

  useEffect(() => {
    // User cancelled by closing this view (navigation, other?)
    return () => abortController.current?.abort()
  }, [])

  if (!initialSubjects?.length) return null
  return (
    <>
      <ActionButton
        appearance="primary"
        size="sm"
        onClick={() => setIsConfirmationOpen(true)}
      >
        Add{' '}
        {pluralize(initialSubjects.length, subjectType, {
          includeCount: false,
        })}{' '}
        to workspace
      </ActionButton>

      <ConfirmationModal
        onConfirm={() => {
          if (isAdding) {
            setIsAdding(false)
            setIsConfirmationOpen(false)
            return
          }

          confirmAddToWorkspace()
        }}
        isOpen={isConfirmationOpen}
        setIsOpen={setIsConfirmationOpen}
        confirmButtonText={isAdding ? 'Stop adding' : 'Yes, add all'}
        title={`Add ${subjectType} to workspace?`}
        description={description}
      />
    </>
  )
}
