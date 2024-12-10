'use client'
import { useTitle } from 'react-use'
import { Loading, LoadingFailed } from '@/common/Loader'
import {
  useFilterMacroList,
  useFilterMacroRemoveMutation,
} from '@/mod-event/useFilterMacrosList'
import { Card } from '@/common/Card'
import { ActionButton, LinkButton } from '@/common/buttons'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { ConfirmationModal } from '@/common/modals/confirmation'
import { useState } from 'react'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function EventFiltersMacrosListPage() {
  const [removingMacro, setRemovingMacro] = useState('')
  const { data: macroList, isFetching, error } = useFilterMacroList()
  const {
    mutateAsync: removeMacro,
    error: removeMacroError,
    isLoading: removingMacroMacro,
  } = useFilterMacroRemoveMutation()

  useTitle('Moderation Filter Macros')

  if (error) {
    return <LoadingFailed error={error} />
  }

  if (!macroList || isFetching) {
    return <Loading />
  }

  const confirmButtonText = removingMacroMacro ? 'Removing...' : 'Yes, Remove'
  const listItems = Object.entries(macroList)

  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      <div className="flex flex-row justify-between items-center">
        <h2 className="font-semibold text-gray-600 dark:text-gray-100 mb-3 mt-4">
          Event Filter Macros
        </h2>
        <LinkButton href="/events" appearance="primary" size="sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          New Macro
        </LinkButton>
      </div>
      {!!listItems.length ? (
        listItems.map(([name, item]) => {
          return (
            <Card key={name} className="mb-3 flex justify-between">
              <div className="">
                <h3>{name}</h3>
                <p className="text-gray-700 dark:text-gray-400 text-sm">
                  Last Updated: {dateFormatter.format(new Date(item.updatedAt))}
                </p>
              </div>
              <div className="">
                <ActionButton
                  appearance="outlined"
                  size="sm"
                  type="button"
                  onClick={() => setRemovingMacro(name)}
                >
                  <TrashIcon className="h-3 w-3" />
                </ActionButton>

                <ConfirmationModal
                  onConfirm={() => {
                    removeMacro(removingMacro).then(() => setRemovingMacro(''))
                  }}
                  isOpen={removingMacro === name}
                  setIsOpen={(val) => setRemovingMacro(val ? name : '')}
                  confirmButtonText={confirmButtonText}
                  confirmButtonDisabled={removingMacroMacro}
                  error={removeMacroError?.['message']}
                  title={`Remove Filter Macro?`}
                  description={
                    <>
                      You{"'"}re about to remove the filter macro{' '}
                      {`"${removingMacro}"`}. You can always recreate your macro
                      from the event filter panel.
                    </>
                  }
                />
              </div>
            </Card>
          )
        })
      ) : (
        <div className="shadow bg-white dark:bg-slate-800 rounded-sm p-5 text-gray-700 dark:text-gray-100 mb-3 text-center">
          <p>No macros found</p>
          <p className="text-sm text-gray-900 dark:text-gray-200">
            Create a new filter macro from the event filter panel.
          </p>
        </div>
      )}
    </div>
  )
}
