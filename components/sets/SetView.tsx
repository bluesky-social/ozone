import { Input, Textarea } from '@/common/forms'
import {
  useSetValueEditor,
  useSetValueList,
  useSetValueRemover,
} from './useSetValues'
import { ActionButton } from '@/common/buttons'
import { toast } from 'react-toastify'
import { TrashIcon } from '@heroicons/react/24/solid'
import { LoadMoreButton } from '@/common/LoadMoreButton'
import { Card } from '@/common/Card'
import { usePermission } from '@/shell/ConfigurationContext'
import { LabelChip } from '@/common/labels'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const SetView = ({ setName }: { setName: string }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSetValueList(setName)
  const valueCreator = useSetValueEditor(setName)
  const valueRemover = useSetValueRemover(setName)
  const canManageSets = usePermission('canManageSets')
  const set = data?.pages[0]?.set

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const values = (formData.get('values') as string)
      .split(',')
      .map((v) => v.trim())
    if (values.length === 0) {
      return toast.error('No values to be added')
    }
    toast.promise(valueCreator.mutateAsync(values), {
      pending: `Adding ${values.length} values...`,
      success: {
        render() {
          // @TODO: Show count here?
          e.target.reset()
          return `Values added to set`
        },
      },
      error: {
        render() {
          return `Error adding values`
        },
      },
    })
  }

  const values = data?.pages.map((page) => page.values).flat()

  return (
    <div className="mb-4">
      {canManageSets && (
        <form name="setValue" onSubmit={handleSubmit} className="mb-2">
          <div className="mb-2">
            <label htmlFor="value" className="flex-1">
              <Textarea
                id="values"
                name="values"
                className="block w-full"
                placeholder="Enter comma separated values..."
              />
            </label>
          </div>
          <div className="flex flex-row justify-end">
            <ActionButton
              appearance="primary"
              size="sm"
              type="submit"
              disabled={valueCreator.isLoading}
            >
              Add values
            </ActionButton>
          </div>
        </form>
      )}
      <Card>
        {set && (
          <div className="px-2 pb-4 flex flex-row justify-between">
            <div>
              <p className="text-sm">{set.name}</p>
              <p className="text-sm dark:text-gray-300">{set.description}</p>
              <p className="text-sm dark:text-gray-300">
                Last updated: {dateFormatter.format(new Date(set.updatedAt))}
              </p>
            </div>
            <div>
              <LabelChip>{set.setSize} values</LabelChip>
            </div>
          </div>
        )}
        {!!values?.length ? (
          <div>
            <h4 className="px-2 pb-2 border-b dark:border-gray-700 mb-2">
              Values in set
            </h4>
            {values?.map((value, i) => {
              const lastItem = i === values.length - 1
              return (
                <div
                  key={value}
                  className={`flex flex-row justify-between px-2 dark:text-gray-300 text-gray-600 ${
                    !lastItem
                      ? 'mb-2 border-b dark:border-gray-700 border-gray-100 pb-3'
                      : ''
                  }`}
                >
                  <p>{value}</p>
                  {canManageSets && (
                    <div>
                      <ActionButton
                        appearance="outlined"
                        size="sm"
                        onClick={() => {
                          valueRemover.mutateAsync([value])
                        }}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </ActionButton>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This set does not have any values
            </p>
          </div>
        )}
      </Card>
      {hasNextPage && (
        <div className="flex justify-center py-3">
          <LoadMoreButton onClick={() => fetchNextPage()} />
        </div>
      )}
    </div>
  )
}
